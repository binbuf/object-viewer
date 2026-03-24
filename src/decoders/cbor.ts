import { decode } from 'cbor-x'
import type { Decoder, DecoderInput, DetectResult, DecodeResult } from './types.ts'

// CBOR self-describe tag: 0xd9d9f7
function hasCborSelfDescribeTag(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 3) return false
  const view = new Uint8Array(buf)
  return view[0] === 0xd9 && view[1] === 0xd9 && view[2] === 0xf7
}

export const cborDecoder: Decoder = {
  id: 'cbor',
  label: 'CBOR',
  priority: 60,
  supportsBinary: true,
  supportsText: false,

  detect(input: DecoderInput): DetectResult {
    if (!input.binary) return { confident: false, confidence: 0 }

    if (hasCborSelfDescribeTag(input.binary)) {
      return { confident: true, confidence: 0.95 }
    }

    try {
      const result = decode(new Uint8Array(input.binary))
      if (result !== null && typeof result === 'object') {
        return { confident: true, confidence: 0.5 }
      }
      return { confident: false, confidence: 0.2 }
    } catch {
      return { confident: false, confidence: 0 }
    }
  },

  decode(input: DecoderInput): DecodeResult {
    const data = decode(new Uint8Array(input.binary!))

    return {
      format: 'cbor',
      formatLabel: 'CBOR',
      data,
      metadata: {},
      raw: `[Binary: ${input.binary!.byteLength} bytes]`,
    }
  },
}
