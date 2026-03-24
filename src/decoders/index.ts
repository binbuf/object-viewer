import type { Decoder, DecoderInput, DecodeResult, DecodeError, FormatId } from './types.ts'
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

function parseErrorPosition(err: unknown): { line: number; column: number } | undefined {
  if (!(err instanceof Error)) return undefined
  const msg = err.message
  // JSON: "... at position 42"
  const posMatch = msg.match(/position\s+(\d+)/i)
  if (posMatch) {
    return { line: 1, column: parseInt(posMatch[1], 10) + 1 }
  }
  // YAML/XML: "at line X, column Y" or "line X column Y"
  const lineColMatch = msg.match(/line\s+(\d+)[\s,]*(?:column|col)\s+(\d+)/i)
  if (lineColMatch) {
    return { line: parseInt(lineColMatch[1], 10), column: parseInt(lineColMatch[2], 10) }
  }
  return undefined
}

function buildDecodeError(err: unknown, decoder: Decoder): DecodeError {
  const message = err instanceof Error ? err.message : String(err)
  return {
    message: `${decoder.label}: ${message}`,
    detail: err instanceof Error ? err.message : undefined,
    format: decoder.id,
    position: parseErrorPosition(err),
  }
}

interface AutoDetectResult {
  result: DecodeResult | null
  errors: DecodeError[]
}

function autoDetectSingle(input: DecoderInput): AutoDetectResult {
  const hasText = Boolean(input.text?.trim())
  const hasBinary = Boolean(input.binary && input.binary.byteLength > 0)
  const errors: DecodeError[] = []

  if (!hasText && !hasBinary) return { result: null, errors }

  const candidates = decoders.filter(d => {
    if (hasText && d.supportsText) return true
    if (hasBinary && d.supportsBinary) return true
    return false
  })

  // Collect detection results
  const detected: Array<{ decoder: Decoder; confidence: number }> = []
  for (const decoder of candidates) {
    const detection = decoder.detect(input)
    if (detection.confident) {
      detected.push({ decoder, confidence: detection.confidence })
    }
  }

  detected.sort((a, b) => b.confidence - a.confidence)

  // Try to decode with confident matches
  for (const { decoder } of detected) {
    try {
      return { result: decoder.decode(input), errors }
    } catch (err) {
      errors.push(buildDecodeError(err, decoder))
    }
  }

  // Fallback: try decoders with any confidence
  for (const decoder of candidates) {
    const detection = decoder.detect(input)
    if (detection.confidence > 0) {
      try {
        return { result: decoder.decode(input), errors }
      } catch (err) {
        errors.push(buildDecodeError(err, decoder))
      }
    }
  }

  return { result: null, errors }
}

function splitAndDecode(input: DecoderInput): DecodeResult | null {
  if (!input.text) return null

  const split = splitTextChunks(input.text)
  if (!split) return null

  const decoded: DecodeResult[] = []
  for (const chunk of split.chunks) {
    const chunkInput: DecoderInput = { text: chunk, source: input.source }
    const { result } = autoDetectSingle(chunkInput)
    if (!result) return null
    decoded.push(result)
  }

  if (decoded.length === 0) return null

  const format = decoded[0].format
  const formatLabel = decoded[0].formatLabel

  return {
    format,
    formatLabel,
    data: decoded.map(r => r.data),
    metadata: decoded[0].metadata,
    raw: input.text,
    itemCount: decoded.length,
    isMultiDocument: true,
  }
}

export interface AutoDetectOutput {
  result: DecodeResult | null
  errors: DecodeError[]
}

export function autoDetect(input: DecoderInput): AutoDetectOutput {
  const { result: single, errors } = autoDetectSingle(input)
  if (single) return { result: single, errors: [] }

  const multi = splitAndDecode(input)
  if (multi) return { result: multi, errors: [] }

  return { result: null, errors }
}

export function decodeAs(format: FormatId, input: DecoderInput): DecodeResult {
  const decoder = decoders.find(d => d.id === format)
  if (!decoder) throw new Error(`Unknown format: ${format}`)
  return decoder.decode(input)
}

export function getAvailableFormats(): Array<{ id: FormatId; label: string }> {
  return decoders.map(d => ({ id: d.id, label: d.label }))
}

export type { FormatId, DecodeResult, DecodeError, DecoderInput } from './types.ts'
