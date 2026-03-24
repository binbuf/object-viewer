import type { SourceToken } from './types.ts'

// Tracks whether we're expecting a key or value at each nesting level
type Context = 'object-key' | 'object-value' | 'array' | 'top'

export function tokenizeJson(source: string): SourceToken[] {
  const tokens: SourceToken[] = []
  const contextStack: Context[] = ['top']
  let i = 0

  function push(text: string, type: SourceToken['type']) {
    if (text) tokens.push({ text, type })
  }

  function ctx(): Context {
    return contextStack[contextStack.length - 1]
  }

  function consumeWhitespace() {
    const start = i
    while (i < source.length && /\s/.test(source[i])) i++
    if (i > start) push(source.slice(start, i), 'whitespace')
  }

  function consumeString(): string {
    const quote = source[i]
    const start = i
    i++ // skip opening quote
    while (i < source.length) {
      if (source[i] === '\\') {
        i += 2 // skip escape sequence
      } else if (source[i] === quote) {
        i++ // skip closing quote
        return source.slice(start, i)
      } else {
        i++
      }
    }
    return source.slice(start, i)
  }

  function consumeNumber(): string {
    const start = i
    // optional sign
    if (source[i] === '+' || source[i] === '-') i++
    // hex
    if (source[i] === '0' && (source[i + 1] === 'x' || source[i + 1] === 'X')) {
      i += 2
      while (i < source.length && /[0-9a-fA-F]/.test(source[i])) i++
      return source.slice(start, i)
    }
    // digits
    while (i < source.length && /[0-9]/.test(source[i])) i++
    // decimal
    if (i < source.length && source[i] === '.') {
      i++
      while (i < source.length && /[0-9]/.test(source[i])) i++
    }
    // exponent
    if (i < source.length && (source[i] === 'e' || source[i] === 'E')) {
      i++
      if (i < source.length && (source[i] === '+' || source[i] === '-')) i++
      while (i < source.length && /[0-9]/.test(source[i])) i++
    }
    return source.slice(start, i)
  }

  function consumeWord(): string {
    const start = i
    while (i < source.length && /[a-zA-Z0-9_$]/.test(source[i])) i++
    return source.slice(start, i)
  }

  function consumeLineComment() {
    const start = i
    i += 2 // skip //
    while (i < source.length && source[i] !== '\n') i++
    push(source.slice(start, i), 'comment')
  }

  function consumeBlockComment() {
    const start = i
    i += 2 // skip /*
    while (i < source.length) {
      if (source[i] === '*' && source[i + 1] === '/') {
        i += 2
        break
      }
      i++
    }
    push(source.slice(start, i), 'comment')
  }

  while (i < source.length) {
    consumeWhitespace()
    if (i >= source.length) break

    const ch = source[i]

    // Comments (JSON5)
    if (ch === '/' && source[i + 1] === '/') {
      consumeLineComment()
      continue
    }
    if (ch === '/' && source[i + 1] === '*') {
      consumeBlockComment()
      continue
    }

    // Object open
    if (ch === '{') {
      push('{', 'punctuation')
      i++
      contextStack.push('object-key')
      continue
    }

    // Object close
    if (ch === '}') {
      push('}', 'punctuation')
      i++
      contextStack.pop()
      continue
    }

    // Array open
    if (ch === '[') {
      push('[', 'punctuation')
      i++
      contextStack.push('array')
      continue
    }

    // Array close
    if (ch === ']') {
      push(']', 'punctuation')
      i++
      contextStack.pop()
      continue
    }

    // Colon
    if (ch === ':') {
      push(':', 'punctuation')
      i++
      // After colon in object, next thing is a value
      if (ctx() === 'object-key') {
        contextStack[contextStack.length - 1] = 'object-value'
      }
      continue
    }

    // Comma
    if (ch === ',') {
      push(',', 'punctuation')
      i++
      // After comma in object, next thing is a key
      if (ctx() === 'object-value') {
        contextStack[contextStack.length - 1] = 'object-key'
      }
      continue
    }

    // Strings
    if (ch === '"' || ch === "'") {
      const text = consumeString()
      push(text, ctx() === 'object-key' ? 'key' : 'string')
      continue
    }

    // Numbers
    if (ch === '-' || ch === '+' || ch === '.' || (ch >= '0' && ch <= '9')) {
      push(consumeNumber(), 'number')
      continue
    }

    // Keywords and unquoted identifiers
    if (/[a-zA-Z_$]/.test(ch)) {
      const word = consumeWord()
      if (word === 'true' || word === 'false') {
        push(word, 'boolean')
      } else if (word === 'null') {
        push(word, 'null')
      } else if (word === 'undefined') {
        push(word, 'null')
      } else if (word === 'Infinity' || word === 'NaN') {
        push(word, 'number')
      } else if (ctx() === 'object-key') {
        // JSON5 unquoted key
        push(word, 'key')
      } else {
        push(word, 'plain')
      }
      continue
    }

    // Any other character
    push(ch, 'plain')
    i++
  }

  return tokens
}
