import type { SourceSpan, SourceMap } from './types.ts'

export function buildXmlSourceMap(source: string): SourceMap {
  const spans: SourceSpan[] = []

  try {
    let i = skipNonElement(source, 0)
    if (i >= source.length) return spans

    const rootTagName = peekTagName(source, i)
    if (!rootTagName) return spans

    // Add root span (depth 0) covering the entire document — matches the tree's root wrapper node
    spans.push({ startOffset: i, endOffset: source.length, nodeId: 'root', depth: 0 })

    // Scan root element with its tag name as the path
    scanElement(source, i, [rootTagName], '', 1, spans)
  } catch {
    // If scanning fails, return whatever we have
  }

  return spans
}

function peekTagName(source: string, i: number): string | null {
  if (i >= source.length || source[i] !== '<') return null
  i++ // skip <
  const start = i
  while (i < source.length && /[a-zA-Z0-9_.:\-]/.test(source[i])) i++
  return i > start ? source.slice(start, i) : null
}

function skipAttributes(source: string, i: number): number {
  while (i < source.length && source[i] !== '>') {
    if (source[i] === '"') {
      i++
      while (i < source.length && source[i] !== '"') i++
      if (i < source.length) i++
    } else if (source[i] === "'") {
      i++
      while (i < source.length && source[i] !== "'") i++
      if (i < source.length) i++
    } else if (source[i] === '/' && i + 1 < source.length && source[i + 1] === '>') {
      break // stop at self-closing />
    } else {
      i++
    }
  }
  return i
}

function scanElement(source: string, i: number, path: string[], prefix: string, depth: number, spans: SourceSpan[]): number {
  const nodeId = prefix + path.join('.')
  const startOffset = i

  if (source[i] !== '<') return i
  i++ // skip <

  // Skip tag name
  while (i < source.length && /[a-zA-Z0-9_.:\-]/.test(source[i])) i++

  // Skip attributes
  i = skipAttributes(source, i)

  // Self-closing tag
  if (source[i] === '/' && source[i + 1] === '>') {
    i += 2
    spans.push({ startOffset, endOffset: i, nodeId, depth })
    return i
  }

  if (source[i] === '>') i++ // skip >

  // Pre-scan: count immediate child tag occurrences
  const childTagCounts = countChildTags(source, i)

  // Track per-tag occurrence index and array ranges
  const childTagIndex: Map<string, number> = new Map()
  const arrayRanges: Map<string, { firstStart: number; lastEnd: number }> = new Map()

  while (i < source.length) {
    // Closing tag
    if (source[i] === '<' && source[i + 1] === '/') {
      const closeEnd = source.indexOf('>', i + 2)
      i = closeEnd >= 0 ? closeEnd + 1 : source.length
      break
    }

    // Child element
    if (source[i] === '<' && source[i + 1] !== '!' && source[i + 1] !== '?') {
      const childTagName = peekTagName(source, i)
      if (!childTagName) { i++; continue }

      const totalCount = childTagCounts.get(childTagName) || 1
      const idx = childTagIndex.get(childTagName) || 0
      childTagIndex.set(childTagName, idx + 1)

      let childPath: string[]
      let childDepth: number

      if (totalCount > 1) {
        // Duplicate tag → array-like: parentPath.tagName.index
        childPath = [...path, childTagName, String(idx)]
        childDepth = depth + 2
      } else {
        // Single tag → parentPath.tagName
        childPath = [...path, childTagName]
        childDepth = depth + 1
      }

      const childStart = i
      i = scanElement(source, i, childPath, prefix, childDepth, spans)

      // Track array ranges for adding array spans later
      if (totalCount > 1) {
        const range = arrayRanges.get(childTagName)
        if (range) {
          range.lastEnd = i
        } else {
          arrayRanges.set(childTagName, { firstStart: childStart, lastEnd: i })
        }
      }

      continue
    }

    // Skip comments
    if (source[i] === '<' && source[i + 1] === '!') {
      if (source.startsWith('<!--', i)) {
        const end = source.indexOf('-->', i + 4)
        i = end >= 0 ? end + 3 : source.length
      } else if (source.startsWith('<![CDATA[', i)) {
        const end = source.indexOf(']]>', i + 9)
        i = end >= 0 ? end + 3 : source.length
      } else {
        i++
      }
      continue
    }

    // Skip processing instructions
    if (source[i] === '<' && source[i + 1] === '?') {
      const end = source.indexOf('?>', i + 2)
      i = end >= 0 ? end + 2 : source.length
      continue
    }

    // Text content - skip
    i++
  }

  // Add array spans for duplicate tag groups
  for (const [tagName, range] of arrayRanges) {
    const arrayNodeId = prefix + [...path, tagName].join('.')
    spans.push({ startOffset: range.firstStart, endOffset: range.lastEnd, nodeId: arrayNodeId, depth: depth + 1 })
  }

  spans.push({ startOffset, endOffset: i, nodeId, depth })
  return i
}

/**
 * Pre-scan to count immediate child element tag names without recursing.
 * This allows us to detect duplicate tags and use array-style paths.
 */
function countChildTags(source: string, startPos: number): Map<string, number> {
  const counts: Map<string, number> = new Map()
  let i = startPos

  while (i < source.length) {
    // Closing tag of parent
    if (source[i] === '<' && source[i + 1] === '/') break

    // Child element
    if (source[i] === '<' && source[i + 1] !== '!' && source[i + 1] !== '?') {
      const tagName = peekTagName(source, i)
      if (tagName) {
        counts.set(tagName, (counts.get(tagName) || 0) + 1)
        i = skipEntireElement(source, i)
        continue
      }
    }

    // Skip comments
    if (source[i] === '<' && source[i + 1] === '!') {
      if (source.startsWith('<!--', i)) {
        const end = source.indexOf('-->', i + 4)
        i = end >= 0 ? end + 3 : source.length
      } else if (source.startsWith('<![CDATA[', i)) {
        const end = source.indexOf(']]>', i + 9)
        i = end >= 0 ? end + 3 : source.length
      } else {
        i++
      }
      continue
    }

    // Skip processing instructions
    if (source[i] === '<' && source[i + 1] === '?') {
      const end = source.indexOf('?>', i + 2)
      i = end >= 0 ? end + 2 : source.length
      continue
    }

    i++
  }

  return counts
}

/**
 * Skip past an entire element including its content and closing tag.
 */
function skipEntireElement(source: string, i: number): number {
  // i is at '<'
  i++ // skip <
  // Skip tag name
  while (i < source.length && /[a-zA-Z0-9_.:\-]/.test(source[i])) i++
  // Skip attributes (handling quoted values)
  i = skipAttributes(source, i)

  // Self-closing
  if (source[i] === '/' && source[i + 1] === '>') return i + 2
  if (source[i] === '>') i++ // skip >

  // Find matching closing tag by tracking depth
  let depth = 1
  while (i < source.length && depth > 0) {
    if (source[i] !== '<') { i++; continue }

    // Closing tag
    if (source[i + 1] === '/') {
      depth--
      const closeEnd = source.indexOf('>', i + 2)
      i = closeEnd >= 0 ? closeEnd + 1 : source.length
      continue
    }

    // Comment, CDATA, PI
    if (source[i + 1] === '!') {
      if (source.startsWith('<!--', i)) {
        const end = source.indexOf('-->', i + 4)
        i = end >= 0 ? end + 3 : source.length
      } else if (source.startsWith('<![CDATA[', i)) {
        const end = source.indexOf(']]>', i + 9)
        i = end >= 0 ? end + 3 : source.length
      } else {
        i++
      }
      continue
    }

    if (source[i + 1] === '?') {
      const end = source.indexOf('?>', i + 2)
      i = end >= 0 ? end + 2 : source.length
      continue
    }

    // Opening tag — check if self-closing
    i++ // skip <
    while (i < source.length && /[a-zA-Z0-9_.:\-]/.test(source[i])) i++
    i = skipAttributes(source, i)

    if (source[i] === '/' && i + 1 < source.length && source[i + 1] === '>') {
      i += 2 // self-closing, no depth change
    } else {
      depth++
      if (source[i] === '>') i++
    }
  }

  return i
}

function skipNonElement(source: string, i: number): number {
  while (i < source.length) {
    // Skip whitespace
    if (/\s/.test(source[i])) { i++; continue }

    // Skip XML declaration
    if (source.startsWith('<?', i)) {
      const end = source.indexOf('?>', i + 2)
      i = end >= 0 ? end + 2 : source.length
      continue
    }

    // Skip DOCTYPE
    if (source.startsWith('<!DOCTYPE', i) || source.startsWith('<!doctype', i)) {
      const end = source.indexOf('>', i)
      i = end >= 0 ? end + 1 : source.length
      continue
    }

    // Skip comments
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4)
      i = end >= 0 ? end + 3 : source.length
      continue
    }

    break
  }
  return i
}
