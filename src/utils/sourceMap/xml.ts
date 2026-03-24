import type { SourceSpan, SourceMap } from './types.ts'

export function buildXmlSourceMap(source: string): SourceMap {
  const spans: SourceSpan[] = []

  try {
    scanXml(source, 0, [], '', 0, spans)
  } catch {
    // If scanning fails, return empty map
  }

  return spans
}

function scanXml(source: string, i: number, path: string[], prefix: string, depth: number, spans: SourceSpan[]): number {
  // Skip to first element
  i = skipNonElement(source, i)
  if (i >= source.length) return i

  const nodeId = prefix + (path.length === 0 ? 'root' : path.join('.'))
  const startOffset = i

  // Expect opening tag
  if (source[i] !== '<' || source[i + 1] === '/' || source[i + 1] === '?' || source[i + 1] === '!') {
    return i
  }

  // Skip tag name
  i++ // skip <
  while (i < source.length && /[a-zA-Z0-9_.:\-]/.test(source[i])) i++

  // Skip attributes
  while (i < source.length && source[i] !== '>' && !(source[i] === '/' && source[i + 1] === '>')) {
    i++
  }

  // Self-closing tag
  if (source[i] === '/' && source[i + 1] === '>') {
    i += 2
    spans.push({ startOffset, endOffset: i, nodeId, depth })
    return i
  }

  if (source[i] === '>') i++ // skip >

  // Scan children
  const childTags: Map<string, number> = new Map()

  while (i < source.length) {
    // Check for closing tag
    if (source[i] === '<' && source[i + 1] === '/') {
      // Find end of closing tag
      const closeEnd = source.indexOf('>', i + 2)
      i = closeEnd >= 0 ? closeEnd + 1 : source.length
      break
    }

    // Check for child element
    if (source[i] === '<' && source[i + 1] !== '!' && source[i + 1] !== '?') {
      // Peek at child tag name
      let j = i + 1
      const childNameStart = j
      while (j < source.length && /[a-zA-Z0-9_.:\-]/.test(source[j])) j++
      const childTagName = source.slice(childNameStart, j)

      const count = childTags.get(childTagName) || 0
      childTags.set(childTagName, count + 1)

      const childKey = count > 0 ? `${childTagName}.${count}` : childTagName
      const childPath = path.length === 0 ? [childKey] : [...path, childKey]

      i = scanXml(source, i, childPath, prefix, depth + 1, spans)
      continue
    }

    // Skip comments, CDATA, processing instructions
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

    if (source[i] === '<' && source[i + 1] === '?') {
      const end = source.indexOf('?>', i + 2)
      i = end >= 0 ? end + 2 : source.length
      continue
    }

    // Text content - skip
    i++
  }

  spans.push({ startOffset, endOffset: i, nodeId, depth })
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
