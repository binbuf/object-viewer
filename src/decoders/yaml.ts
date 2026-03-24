import YAML from 'yaml'
import type { Decoder, DecoderInput, DetectResult, DecodeResult } from './types.ts'

export const yamlDecoder: Decoder = {
  id: 'yaml',
  label: 'YAML',
  priority: 70,
  supportsBinary: false,
  supportsText: true,

  detect(input: DecoderInput): DetectResult {
    if (!input.text) return { confident: false, confidence: 0 }

    const trimmed = input.text.trim()
    if (trimmed.length === 0) return { confident: false, confidence: 0 }

    // If it's valid JSON, prefer the JSON decoder
    try {
      JSON.parse(trimmed)
      return { confident: false, confidence: 0.3 }
    } catch {
      // not JSON, good — YAML is more likely
    }

    // YAML document markers
    if (trimmed.startsWith('---') || trimmed.startsWith('%YAML')) {
      return { confident: true, confidence: 0.95 }
    }

    // Try parsing as YAML
    try {
      const result = YAML.parse(trimmed)
      // Only consider it YAML if it produces an object/array (not just a plain string)
      if (result !== null && typeof result === 'object') {
        // Look for YAML-specific patterns: key: value with no quotes
        if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*:/m.test(trimmed)) {
          return { confident: true, confidence: 0.8 }
        }
        // Block sequences
        if (/^-\s+/m.test(trimmed)) {
          return { confident: true, confidence: 0.75 }
        }
        return { confident: true, confidence: 0.6 }
      }
      return { confident: false, confidence: 0.2 }
    } catch {
      return { confident: false, confidence: 0 }
    }
  },

  decode(input: DecoderInput): DecodeResult {
    const text = input.text!

    // Check for multi-document YAML (--- separators)
    const docs = YAML.parseAllDocuments(text)
    if (docs.length > 1) {
      const items = docs
        .map(doc => doc.toJSON())
        .filter((item): item is NonNullable<typeof item> => item != null)
      if (items.length > 1) {
        return {
          format: 'yaml',
          formatLabel: 'YAML',
          data: items,
          metadata: {},
          raw: text,
          itemCount: items.length,
          isMultiDocument: true,
        }
      }
    }

    const data = YAML.parse(text)

    return {
      format: 'yaml',
      formatLabel: 'YAML',
      data,
      metadata: {},
      raw: text,
    }
  },
}
