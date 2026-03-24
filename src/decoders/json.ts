import JSON5 from 'json5'
import type { Decoder, DecoderInput, DetectResult, DecodeResult } from './types.ts'

export const jsonDecoder: Decoder = {
  id: 'json',
  label: 'JSON',
  priority: 90,
  supportsBinary: false,
  supportsText: true,

  detect(input: DecoderInput): DetectResult {
    if (!input.text) return { confident: false, confidence: 0 }

    const trimmed = input.text.trim()
    if (trimmed.length === 0) return { confident: false, confidence: 0 }

    // Standard JSON
    try {
      JSON.parse(trimmed)
      return { confident: true, confidence: 0.95 }
    } catch {
      // not standard JSON
    }

    // JSON5 (comments, trailing commas, unquoted keys, etc.)
    try {
      JSON5.parse(trimmed)
      return { confident: true, confidence: 0.8 }
    } catch {
      // not JSON5 either
    }

    return { confident: false, confidence: 0 }
  },

  decode(input: DecoderInput): DecodeResult {
    const text = input.text!
    const trimmed = text.trim()

    // Try standard JSON first
    try {
      const data = JSON.parse(trimmed)
      return {
        format: 'json',
        formatLabel: 'JSON',
        data,
        metadata: {},
        raw: text,
      }
    } catch {
      // fall through to JSON5
    }

    // Try JSON5
    const data = JSON5.parse(trimmed)
    return {
      format: 'json5',
      formatLabel: 'JSON5',
      data,
      metadata: {},
      raw: text,
    }
  },
}
