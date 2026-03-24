import type { Decoder, DecoderInput, DecodeResult, FormatId } from './types.ts'
import { jsonDecoder } from './json.ts'
import { jwtDecoder } from './jwt.ts'
import { xmlDecoder } from './xml.ts'
import { yamlDecoder } from './yaml.ts'
import { msgpackDecoder } from './msgpack.ts'
import { cborDecoder } from './cbor.ts'
import { protobufDecoder } from './protobuf.ts'
import { splitTextChunks } from '../utils/splitInput.ts'

const decoders: Decoder[] = [
  jwtDecoder,
  jsonDecoder,
  xmlDecoder,
  yamlDecoder,
  cborDecoder,
  msgpackDecoder,
  protobufDecoder,
].sort((a, b) => b.priority - a.priority)

function autoDetectSingle(input: DecoderInput): DecodeResult | null {
  const hasText = Boolean(input.text?.trim())
  const hasBinary = Boolean(input.binary && input.binary.byteLength > 0)

  if (!hasText && !hasBinary) return null

  // Filter decoders by input type
  const candidates = decoders.filter(d => {
    if (hasText && d.supportsText) return true
    if (hasBinary && d.supportsBinary) return true
    return false
  })

  // Collect detection results
  const results: Array<{ decoder: Decoder; confidence: number }> = []
  for (const decoder of candidates) {
    const detection = decoder.detect(input)
    if (detection.confident) {
      results.push({ decoder, confidence: detection.confidence })
    }
  }

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence)

  // Try to decode with the best match
  for (const { decoder } of results) {
    try {
      return decoder.decode(input)
    } catch {
      // Try next decoder
    }
  }

  // Fallback: try all decoders that had any confidence
  for (const decoder of candidates) {
    const detection = decoder.detect(input)
    if (detection.confidence > 0) {
      try {
        return decoder.decode(input)
      } catch {
        // Try next
      }
    }
  }

  return null
}

function splitAndDecode(input: DecoderInput): DecodeResult | null {
  if (!input.text) return null

  const split = splitTextChunks(input.text)
  if (!split) return null

  const decoded: DecodeResult[] = []
  for (const chunk of split.chunks) {
    const chunkInput: DecoderInput = { text: chunk, source: input.source }
    const result = autoDetectSingle(chunkInput)
    if (!result) return null // If any chunk fails, abort
    decoded.push(result)
  }

  if (decoded.length === 0) return null

  // Use the format of the first result
  const format = decoded[0].format
  const formatLabel = decoded[0].formatLabel

  return {
    format,
    formatLabel,
    data: decoded.map(r => r.data),
    metadata: decoded[0].metadata,
    raw: input.text,
    itemCount: decoded.length,
  }
}

export function autoDetect(input: DecoderInput): DecodeResult | null {
  // Try single-object decode first
  const single = autoDetectSingle(input)
  if (single) return single

  // Fallback: try splitting into multiple objects
  return splitAndDecode(input)
}

export function decodeAs(format: FormatId, input: DecoderInput): DecodeResult {
  const decoder = decoders.find(d => d.id === format)
  if (!decoder) throw new Error(`Unknown format: ${format}`)
  return decoder.decode(input)
}

export function getAvailableFormats(): Array<{ id: FormatId; label: string }> {
  return decoders.map(d => ({ id: d.id, label: d.label }))
}

export type { FormatId, DecodeResult, DecoderInput } from './types.ts'
