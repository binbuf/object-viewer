import { decode } from '@msgpack/msgpack'
import type { Decoder, DecoderInput, DetectResult, DecodeResult } from './types.ts'

export const msgpackDecoder: Decoder = {
  id: 'msgpack',
  label: 'MessagePack',
  priority: 50,
  supportsBinary: true,
  supportsText: false,

  detect(input: DecoderInput): DetectResult {
    if (!input.binary) return { confident: false, confidence: 0 }

    try {
      const result = decode(new Uint8Array(input.binary))
      if (result !== null && typeof result === 'object') {
        return { confident: true, confidence: 0.6 }
      }
      return { confident: false, confidence: 0.3 }
    } catch {
      return { confident: false, confidence: 0 }
    }
  },

  decode(input: DecoderInput): DecodeResult {
    const data = decode(new Uint8Array(input.binary!))

    return {
      format: 'msgpack',
      formatLabel: 'MessagePack',
      data,
      metadata: {},
      raw: `[Binary: ${input.binary!.byteLength} bytes]`,
    }
  },
}
