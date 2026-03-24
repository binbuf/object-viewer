import { XMLParser } from 'fast-xml-parser'
import type { Decoder, DecoderInput, DetectResult, DecodeResult } from './types.ts'

export const xmlDecoder: Decoder = {
  id: 'xml',
  label: 'XML',
  priority: 80,
  supportsBinary: false,
  supportsText: true,

  detect(input: DecoderInput): DetectResult {
    if (!input.text) return { confident: false, confidence: 0 }

    const trimmed = input.text.trim()
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<!DOCTYPE')) {
      return { confident: true, confidence: 0.99 }
    }
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return { confident: true, confidence: 0.85 }
    }

    return { confident: false, confidence: 0 }
  },

  decode(input: DecoderInput): DecodeResult {
    const text = input.text!
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      preserveOrder: false,
      parseAttributeValue: true,
      trimValues: true,
    })

    const data = parser.parse(text)

    // Extract root element name
    const keys = Object.keys(data).filter(k => k !== '?xml' && k !== '!DOCTYPE')
    const rootElement = keys[0] || 'unknown'

    // Extract namespaces from root
    const namespaces: Record<string, string> = {}
    const root = data[rootElement]
    if (root && typeof root === 'object') {
      for (const [key, value] of Object.entries(root)) {
        if (key.startsWith('@_xmlns')) {
          const prefix = key === '@_xmlns' ? '' : key.replace('@_xmlns:', '')
          namespaces[prefix] = String(value)
        }
      }
    }

    return {
      format: 'xml',
      formatLabel: 'XML',
      data,
      metadata: {
        xml: {
          rootElement,
          namespaces,
        },
      },
      raw: text,
    }
  },
}
