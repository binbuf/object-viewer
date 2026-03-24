const JWT_PATTERN = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/

/**
 * Split concatenated JSON values by tracking brace/bracket depth.
 * Handles: {"a":1}{"b":2}, {"a":1}\n{"b":2}, [1]\n[2], mixed.
 */
export function splitJsonChunks(text: string): string[] | null {
  const trimmed = text.trim()
  if (trimmed.length === 0) return null

  const chunks: string[] = []
  let i = 0

  while (i < trimmed.length) {
    // Skip whitespace between chunks
    while (i < trimmed.length && /\s/.test(trimmed[i])) i++
    if (i >= trimmed.length) break

    const ch = trimmed[i]

    if (ch === '{' || ch === '[') {
      const close = ch === '{' ? '}' : ']'
      const start = i
      let depth = 1
      let inString = false
      let escaped = false
      i++

      while (i < trimmed.length && depth > 0) {
        const c = trimmed[i]
        if (escaped) {
          escaped = false
        } else if (c === '\\' && inString) {
          escaped = true
        } else if (c === '"') {
          inString = !inString
        } else if (!inString) {
          if (c === ch) depth++
          else if (c === close) depth--
        }
        i++
      }

      if (depth === 0) {
        chunks.push(trimmed.slice(start, i))
      } else {
        // Unbalanced — not splittable
        return null
      }
    } else {
      // Not a JSON object/array start — can't split
      return null
    }
  }

  return chunks.length > 1 ? chunks : null
}

/**
 * Split multiple JWTs separated by whitespace/newlines.
 */
export function splitJwtChunks(text: string): string[] | null {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  if (tokens.length <= 1) return null

  for (const token of tokens) {
    if (!JWT_PATTERN.test(token)) return null
  }

  return tokens
}

/**
 * Split multiple top-level XML elements by tracking tag depth.
 */
export function splitXmlChunks(text: string): string[] | null {
  // Strip XML declaration and DOCTYPE
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^<\?xml[^?]*\?>\s*/i, '')
  cleaned = cleaned.replace(/^<!DOCTYPE[^>]*>\s*/i, '')

  if (cleaned.length === 0) return null

  const chunks: string[] = []
  let i = 0

  while (i < cleaned.length) {
    // Skip whitespace between elements
    while (i < cleaned.length && /\s/.test(cleaned[i])) i++
    if (i >= cleaned.length) break

    if (cleaned[i] !== '<') return null // Not an XML element

    const start = i
    let depth = 0

    while (i < cleaned.length) {
      if (cleaned[i] === '<') {
        // Check for comment
        if (cleaned.startsWith('<!--', i)) {
          const end = cleaned.indexOf('-->', i + 4)
          if (end === -1) return null
          i = end + 3
          continue
        }
        // Check for CDATA
        if (cleaned.startsWith('<![CDATA[', i)) {
          const end = cleaned.indexOf(']]>', i + 9)
          if (end === -1) return null
          i = end + 3
          continue
        }
        // Check for processing instruction
        if (cleaned.startsWith('<?', i)) {
          const end = cleaned.indexOf('?>', i + 2)
          if (end === -1) return null
          i = end + 2
          continue
        }
        // Closing tag
        if (cleaned[i + 1] === '/') {
          depth--
          const end = cleaned.indexOf('>', i)
          if (end === -1) return null
          i = end + 1
          if (depth === 0) break
          continue
        }
        // Opening tag
        depth++
        // Find end of tag
        let j = i + 1
        let inAttrString = false
        let attrQuote = ''
        while (j < cleaned.length) {
          if (inAttrString) {
            if (cleaned[j] === attrQuote) inAttrString = false
          } else if (cleaned[j] === '"' || cleaned[j] === "'") {
            inAttrString = true
            attrQuote = cleaned[j]
          } else if (cleaned[j] === '>') {
            // Self-closing?
            if (cleaned[j - 1] === '/') {
              depth--
            }
            break
          }
          j++
        }
        i = j + 1
        if (depth === 0) break
        continue
      }
      i++
    }

    if (depth === 0 && i > start) {
      chunks.push(cleaned.slice(start, i).trim())
    } else {
      return null
    }
  }

  return chunks.length > 1 ? chunks : null
}

/**
 * Split YAML multi-document text on `---` separators.
 * Returns the raw document strings (without separators).
 */
export function splitYamlChunks(text: string): string[] | null {
  // Must contain at least one --- separator (not just at the start)
  if (!text.includes('\n---')) {
    // Check if it starts with --- followed by another ---
    if (!text.startsWith('---') || text.indexOf('---', 3) === -1) {
      return null
    }
  }

  const docs = text.split(/^---$/m)
    .map(d => d.trim())
    .filter(d => d.length > 0)

  return docs.length > 1 ? docs : null
}

/**
 * Try all splitting strategies. Returns chunks if the input
 * contains multiple objects, or null if it's a single object.
 */
export function splitTextChunks(text: string): { chunks: string[]; hint: 'json' | 'jwt' | 'xml' | 'yaml' } | null {
  const jwt = splitJwtChunks(text)
  if (jwt) return { chunks: jwt, hint: 'jwt' }

  const json = splitJsonChunks(text)
  if (json) return { chunks: json, hint: 'json' }

  const xml = splitXmlChunks(text)
  if (xml) return { chunks: xml, hint: 'xml' }

  const yaml = splitYamlChunks(text)
  if (yaml) return { chunks: yaml, hint: 'yaml' }

  return null
}
