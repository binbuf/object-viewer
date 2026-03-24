import type { SourceToken } from './types.ts'

export function tokenizeJwt(source: string): SourceToken[] {
  const tokens: SourceToken[] = []
  const trimmed = source.trim()

  // Leading whitespace
  if (source.startsWith(' ') || source.startsWith('\n') || source.startsWith('\t')) {
    const wsMatch = source.match(/^(\s+)/)
    if (wsMatch) tokens.push({ text: wsMatch[1], type: 'whitespace' })
  }

  const parts = trimmed.split('.')
  if (parts.length >= 2) {
    // Color each segment: header, payload, signature
    const labels: Array<SourceToken['type']> = ['keyword', 'string', 'number']
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) tokens.push({ text: '.', type: 'punctuation' })
      tokens.push({ text: parts[i], type: labels[i] || 'plain' })
    }
  } else {
    tokens.push({ text: trimmed, type: 'plain' })
  }

  // Trailing whitespace
  const trailingWs = source.slice(source.trimEnd().length)
  if (trailingWs) tokens.push({ text: trailingWs, type: 'whitespace' })

  return tokens
}
