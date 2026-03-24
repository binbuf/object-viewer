import type { SourceToken } from './types.ts'

function classifyValue(text: string): SourceToken['type'] {
  const trimmed = text.trim()
  if (!trimmed) return 'plain'
  if (trimmed === 'null' || trimmed === '~' || trimmed === 'Null' || trimmed === 'NULL') return 'null'
  if (trimmed === 'true' || trimmed === 'false' || trimmed === 'True' || trimmed === 'False' ||
      trimmed === 'TRUE' || trimmed === 'FALSE' || trimmed === 'yes' || trimmed === 'no' ||
      trimmed === 'Yes' || trimmed === 'No' || trimmed === 'YES' || trimmed === 'NO' ||
      trimmed === 'on' || trimmed === 'off' || trimmed === 'On' || trimmed === 'Off' ||
      trimmed === 'ON' || trimmed === 'OFF') return 'boolean'
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) return 'number'
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) return 'number'
  if (/^0o[0-7]+$/.test(trimmed)) return 'number'
  if (trimmed === '.inf' || trimmed === '-.inf' || trimmed === '.Inf' ||
      trimmed === '-.Inf' || trimmed === '.INF' || trimmed === '-.INF' ||
      trimmed === '.nan' || trimmed === '.NaN' || trimmed === '.NAN') return 'number'
  return 'string'
}

export function tokenizeYaml(source: string): SourceToken[] {
  const tokens: SourceToken[] = []
  const lines = source.split('\n')

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    if (lineIdx > 0) tokens.push({ text: '\n', type: 'whitespace' })

    if (!line) continue

    // Document markers
    if (/^---(\s|$)/.test(line) || /^\.\.\.(\s|$)/.test(line)) {
      tokens.push({ text: line, type: 'keyword' })
      continue
    }

    let pos = 0

    // Leading whitespace
    const indentMatch = line.match(/^(\s+)/)
    if (indentMatch) {
      tokens.push({ text: indentMatch[1], type: 'whitespace' })
      pos = indentMatch[1].length
    }

    const rest = line.slice(pos)

    // Full-line comment
    if (rest.startsWith('#')) {
      tokens.push({ text: rest, type: 'comment' })
      continue
    }

    // Dash for sequence items
    if (rest.startsWith('- ')) {
      tokens.push({ text: '- ', type: 'punctuation' })
      pos += 2
      const afterDash = line.slice(pos)

      // Check if rest after dash is a key: value
      const kvMatch = afterDash.match(/^([^\s:][^:]*?)\s*(:)(\s|$)/)
      if (kvMatch) {
        tokens.push({ text: kvMatch[1], type: 'key' })
        tokens.push({ text: kvMatch[2], type: 'punctuation' })
        pos += kvMatch[1].length + kvMatch[2].length
        const remainder = line.slice(pos)
        if (remainder) {
          tokenizeValuePart(remainder, tokens)
        }
        continue
      }

      // Value after dash
      if (afterDash) {
        tokenizeValuePart(afterDash, tokens)
      }
      continue
    }

    // Key: value pair
    const kvMatch = rest.match(/^([^\s:][^:]*?)\s*(:)(\s|$)/)
    if (kvMatch) {
      tokens.push({ text: kvMatch[1], type: 'key' })
      tokens.push({ text: kvMatch[2], type: 'punctuation' })
      pos += kvMatch[1].length + kvMatch[2].length
      const remainder = line.slice(pos)
      if (remainder) {
        tokenizeValuePart(remainder, tokens)
      }
      continue
    }

    // Block scalar indicators
    if (rest === '|' || rest === '>' || rest === '|-' || rest === '>-' ||
        rest === '|+' || rest === '>+') {
      tokens.push({ text: rest, type: 'punctuation' })
      continue
    }

    // Plain value or continuation
    if (rest) {
      tokenizeValuePart(rest, tokens)
    }
  }

  return tokens
}

function tokenizeValuePart(text: string, tokens: SourceToken[]) {
  // Leading whitespace
  const wsMatch = text.match(/^(\s+)/)
  if (wsMatch) {
    tokens.push({ text: wsMatch[1], type: 'whitespace' })
    text = text.slice(wsMatch[1].length)
  }

  if (!text) return

  // Inline comment at end
  const commentIdx = findInlineComment(text)
  let value = commentIdx >= 0 ? text.slice(0, commentIdx) : text
  const comment = commentIdx >= 0 ? text.slice(commentIdx) : ''

  // Trim trailing whitespace from value
  const trailingWs = value.match(/(\s+)$/)
  if (trailingWs) {
    value = value.slice(0, -trailingWs[1].length)
  }

  if (value) {
    // Quoted strings
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      tokens.push({ text: value, type: 'string' })
    } else if (value.startsWith('{') || value.startsWith('[')) {
      // Flow collections - treat as plain
      tokens.push({ text: value, type: 'plain' })
    } else {
      tokens.push({ text: value, type: classifyValue(value) })
    }
  }

  if (trailingWs) {
    tokens.push({ text: trailingWs[1], type: 'whitespace' })
  }

  if (comment) {
    tokens.push({ text: comment, type: 'comment' })
  }
}

function findInlineComment(text: string): number {
  // Find # preceded by whitespace, not inside quotes
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"' && !inSingle) inDouble = !inDouble
    else if (text[i] === "'" && !inDouble) inSingle = !inSingle
    else if (text[i] === '#' && !inSingle && !inDouble && i > 0 && /\s/.test(text[i - 1])) {
      return i
    }
  }
  return -1
}
