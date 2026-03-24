import JSON5 from 'json5'
import YAML from 'yaml'
import type { FormatId } from '../decoders/types.ts'
import { splitJsonChunks } from './splitInput.ts'

function formatJson(text: string): string {
  const trimmed = text.trim()

  // Try multi-object: split and format each
  const chunks = splitJsonChunks(trimmed)
  if (chunks) {
    return chunks.map(chunk => {
      try {
        return JSON.stringify(JSON.parse(chunk), null, 2)
      } catch {
        try {
          return JSON.stringify(JSON5.parse(chunk), null, 2)
        } catch {
          return chunk
        }
      }
    }).join('\n\n')
  }

  // Single object
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    try {
      return JSON.stringify(JSON5.parse(trimmed), null, 2)
    } catch {
      return text
    }
  }
}

function formatYaml(text: string): string {
  try {
    const docs = YAML.parseAllDocuments(text)
    if (docs.length > 1) {
      return docs.map(doc => {
        const val = doc.toJSON()
        return val != null ? YAML.stringify(val).trim() : ''
      }).filter(Boolean).join('\n---\n')
    }
    const data = YAML.parse(text)
    return YAML.stringify(data).trim()
  } catch {
    return text
  }
}

function formatXml(text: string): string {
  // Basic XML indent formatting
  try {
    let formatted = ''
    let indent = 0
    const lines = text.replace(/>\s*</g, '>\n<').split('\n')

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue

      if (line.startsWith('</')) {
        indent = Math.max(0, indent - 1)
      }

      formatted += '  '.repeat(indent) + line + '\n'

      if (line.startsWith('<') && !line.startsWith('</') && !line.startsWith('<?') && !line.startsWith('<!') && !line.endsWith('/>') && !line.includes('</')) {
        indent++
      }
    }

    return formatted.trim()
  } catch {
    return text
  }
}

export function formatInput(text: string, format: FormatId): string {
  switch (format) {
    case 'json':
    case 'json5':
      return formatJson(text)
    case 'yaml':
      return formatYaml(text)
    case 'xml':
      return formatXml(text)
    default:
      return text
  }
}
