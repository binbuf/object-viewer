import type { SourceToken } from './types.ts'

export function tokenizeXml(source: string): SourceToken[] {
  const tokens: SourceToken[] = []
  let i = 0

  function push(text: string, type: SourceToken['type']) {
    if (text) tokens.push({ text, type })
  }

  while (i < source.length) {
    // Comment
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4)
      const commentEnd = end >= 0 ? end + 3 : source.length
      push(source.slice(i, commentEnd), 'comment')
      i = commentEnd
      continue
    }

    // CDATA
    if (source.startsWith('<![CDATA[', i)) {
      const end = source.indexOf(']]>', i + 9)
      const cdataEnd = end >= 0 ? end + 3 : source.length
      push(source.slice(i, cdataEnd), 'string')
      i = cdataEnd
      continue
    }

    // Processing instruction / XML declaration
    if (source.startsWith('<?', i)) {
      const end = source.indexOf('?>', i + 2)
      const piEnd = end >= 0 ? end + 2 : source.length
      push(source.slice(i, piEnd), 'keyword')
      i = piEnd
      continue
    }

    // DOCTYPE
    if (source.startsWith('<!DOCTYPE', i) || source.startsWith('<!doctype', i)) {
      const end = source.indexOf('>', i)
      const dtdEnd = end >= 0 ? end + 1 : source.length
      push(source.slice(i, dtdEnd), 'keyword')
      i = dtdEnd
      continue
    }

    // Tags (opening, closing, self-closing)
    if (source[i] === '<') {
      // < or </
      const isClosing = source[i + 1] === '/'
      push(isClosing ? '</' : '<', 'punctuation')
      i += isClosing ? 2 : 1

      // Tag name
      const nameStart = i
      while (i < source.length && /[a-zA-Z0-9_.:-]/.test(source[i])) i++
      if (i > nameStart) push(source.slice(nameStart, i), 'tag')

      // Attributes
      while (i < source.length && source[i] !== '>' && !(source[i] === '/' && source[i + 1] === '>')) {
        // Whitespace
        const wsStart = i
        while (i < source.length && /\s/.test(source[i])) i++
        if (i > wsStart) push(source.slice(wsStart, i), 'whitespace')

        if (i >= source.length || source[i] === '>' || (source[i] === '/' && source[i + 1] === '>')) break

        // Attribute name
        const attrStart = i
        while (i < source.length && /[a-zA-Z0-9_.:-]/.test(source[i])) i++
        if (i > attrStart) push(source.slice(attrStart, i), 'attribute')

        // Whitespace around =
        const wsStart2 = i
        while (i < source.length && /\s/.test(source[i])) i++
        if (i > wsStart2) push(source.slice(wsStart2, i), 'whitespace')

        // =
        if (i < source.length && source[i] === '=') {
          push('=', 'punctuation')
          i++

          // Whitespace after =
          const wsStart3 = i
          while (i < source.length && /\s/.test(source[i])) i++
          if (i > wsStart3) push(source.slice(wsStart3, i), 'whitespace')

          // Attribute value
          if (i < source.length && (source[i] === '"' || source[i] === "'")) {
            const quote = source[i]
            const valStart = i
            i++ // skip opening quote
            while (i < source.length && source[i] !== quote) i++
            if (i < source.length) i++ // skip closing quote
            push(source.slice(valStart, i), 'string')
          }
        }
      }

      // Self-closing />
      if (source[i] === '/' && source[i + 1] === '>') {
        push('/>', 'punctuation')
        i += 2
      } else if (source[i] === '>') {
        push('>', 'punctuation')
        i++
      }
      continue
    }

    // Text content between tags
    const textStart = i
    while (i < source.length && source[i] !== '<') i++
    if (i > textStart) {
      const text = source.slice(textStart, i)
      // Split whitespace from content
      const match = text.match(/^(\s*)(.*?)(\s*)$/)
      if (match) {
        if (match[1]) push(match[1], 'whitespace')
        if (match[2]) {
          const trimmed = match[2]
          // Type-classify text content
          if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
            push(trimmed, 'number')
          } else if (trimmed === 'true' || trimmed === 'false') {
            push(trimmed, 'boolean')
          } else if (trimmed === 'null') {
            push(trimmed, 'null')
          } else {
            push(trimmed, 'string')
          }
        }
        if (match[3]) push(match[3], 'whitespace')
      }
    }
  }

  return tokens
}
