import type { SourceSpan, SourceMap } from './types.ts'

export function buildJsonSourceMap(source: string, isMultiDocument: boolean): SourceMap {
  const spans: SourceSpan[] = []

  if (isMultiDocument) {
    const chunks = splitJsonChunks(source)
    let searchFrom = 0
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const chunkStart = source.indexOf(chunk, searchFrom)
      if (chunkStart < 0) continue
      const prefix = `doc${i}.`
      scanValue(source, chunkStart, [], prefix, 0, spans)
      searchFrom = chunkStart + chunk.length
    }
  } else {
    const start = skipWhitespace(source, 0)
    if (start < source.length) {
      scanValue(source, start, [], '', 0, spans)
    }
  }

  return spans
}

function skipWhitespace(source: string, i: number): number {
  while (i < source.length && /\s/.test(source[i])) i++
  // Skip comments (JSON5)
  if (i < source.length - 1) {
    if (source[i] === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++
      return skipWhitespace(source, i)
    }
    if (source[i] === '/' && source[i + 1] === '*') {
      i += 2
      while (i < source.length - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++
      i += 2
      return skipWhitespace(source, i)
    }
  }
  return i
}

function readString(source: string, i: number): { value: string; end: number } {
  const quote = source[i]
  i++ // skip opening quote
  let value = ''
  while (i < source.length) {
    if (source[i] === '\\') {
      i += 2
    } else if (source[i] === quote) {
      i++ // skip closing quote
      return { value, end: i }
    } else {
      value += source[i]
      i++
    }
  }
  return { value, end: i }
}

function readUnquotedKey(source: string, i: number): { value: string; end: number } {
  const start = i
  while (i < source.length && /[a-zA-Z0-9_$]/.test(source[i])) i++
  return { value: source.slice(start, i), end: i }
}

function skipPrimitive(source: string, i: number): number {
  // strings
  if (source[i] === '"' || source[i] === "'") {
    const quote = source[i]
    i++
    while (i < source.length) {
      if (source[i] === '\\') i += 2
      else if (source[i] === quote) { i++; break }
      else i++
    }
    return i
  }
  // numbers, booleans, null, identifiers
  const start = i
  if (source[i] === '-' || source[i] === '+') i++
  while (i < source.length && /[a-zA-Z0-9_.xXeE+\-]/.test(source[i])) i++
  if (i === start) i++ // fallback: skip one char
  return i
}

// Mirrors treeBuilder.ts pathToId: empty path = 'root', otherwise join with '.'
function pathToId(path: string[]): string {
  return path.length === 0 ? 'root' : path.join('.')
}

function scanValue(source: string, i: number, path: string[], prefix: string, depth: number, spans: SourceSpan[]): number {
  i = skipWhitespace(source, i)
  if (i >= source.length) return i

  const nodeId = prefix + pathToId(path)
  const startOffset = i
  const ch = source[i]

  if (ch === '{') {
    // Object
    i++ // skip {
    i = skipWhitespace(source, i)

    while (i < source.length && source[i] !== '}') {
      i = skipWhitespace(source, i)
      if (i >= source.length || source[i] === '}') break

      // Read key
      let key: string
      if (source[i] === '"' || source[i] === "'") {
        const result = readString(source, i)
        key = result.value
        i = result.end
      } else {
        const result = readUnquotedKey(source, i)
        key = result.value
        i = result.end
      }

      i = skipWhitespace(source, i)
      if (i < source.length && source[i] === ':') i++ // skip colon
      i = skipWhitespace(source, i)

      // Build child path mirroring treeBuilder: root children get [key], deeper get [...parent, key]
      const childPath = [...path, key]

      // Scan child value
      i = scanValue(source, i, childPath, prefix, depth + 1, spans)

      i = skipWhitespace(source, i)
      if (i < source.length && source[i] === ',') i++ // skip comma
    }

    if (i < source.length && source[i] === '}') i++ // skip }
    spans.push({ startOffset, endOffset: i, nodeId, depth })
    return i
  }

  if (ch === '[') {
    // Array
    i++ // skip [
    i = skipWhitespace(source, i)
    let index = 0

    while (i < source.length && source[i] !== ']') {
      i = skipWhitespace(source, i)
      if (i >= source.length || source[i] === ']') break

      const childPath = [...path, String(index)]

      i = scanValue(source, i, childPath, prefix, depth + 1, spans)
      index++

      i = skipWhitespace(source, i)
      if (i < source.length && source[i] === ',') i++ // skip comma
    }

    if (i < source.length && source[i] === ']') i++ // skip ]
    spans.push({ startOffset, endOffset: i, nodeId, depth })
    return i
  }

  // Primitive value
  const endOffset = skipPrimitive(source, i)
  spans.push({ startOffset, endOffset, nodeId, depth })
  return endOffset
}

// Simple JSON chunk splitter for multi-document
function splitJsonChunks(source: string): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < source.length) {
    i = skipWhitespace(source, i)
    if (i >= source.length) break

    const start = i
    const ch = source[i]

    if (ch === '{' || ch === '[') {
      const close = ch === '{' ? '}' : ']'
      let depth = 0
      let inStr = false
      let strChar = ''

      while (i < source.length) {
        if (inStr) {
          if (source[i] === '\\') i++
          else if (source[i] === strChar) inStr = false
        } else {
          if (source[i] === '"' || source[i] === "'") { inStr = true; strChar = source[i] }
          else if (source[i] === ch) depth++
          else if (source[i] === close) { depth--; if (depth === 0) { i++; break } }
        }
        i++
      }

      chunks.push(source.slice(start, i))
    } else {
      // Skip non-structural content
      while (i < source.length && !/[\s{[\]},]/.test(source[i])) i++
      if (i > start) chunks.push(source.slice(start, i))
    }
  }
  return chunks
}
