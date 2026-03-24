import type { Decoder, DecoderInput, DetectResult, DecodeResult } from './types.ts'

// Wire types in protobuf
const WIRE_TYPES: Record<number, string> = {
  0: 'varint',
  1: 'fixed64',
  2: 'length-delimited',
  5: 'fixed32',
}

interface ProtobufField {
  fieldNumber: number
  wireType: number
  wireTypeName: string
  value: unknown
}

function decodeVarint(bytes: Uint8Array, offset: number): [bigint, number] {
  let result = 0n
  let shift = 0n
  let pos = offset
  while (pos < bytes.length) {
    const byte = bytes[pos]
    result |= BigInt(byte & 0x7f) << shift
    pos++
    if ((byte & 0x80) === 0) break
    shift += 7n
  }
  return [result, pos]
}

function tryDecodeProtobuf(bytes: Uint8Array): ProtobufField[] {
  const fields: ProtobufField[] = []
  let offset = 0

  while (offset < bytes.length) {
    const [tag, newOffset] = decodeVarint(bytes, offset)
    offset = newOffset
    const fieldNumber = Number(tag >> 3n)
    const wireType = Number(tag & 7n)

    if (fieldNumber === 0 || !(wireType in WIRE_TYPES)) {
      throw new Error(`Invalid field number ${fieldNumber} or wire type ${wireType}`)
    }

    const wireTypeName = WIRE_TYPES[wireType]
    let value: unknown

    switch (wireType) {
      case 0: { // varint
        const [v, next] = decodeVarint(bytes, offset)
        offset = next
        value = Number(v)
        break
      }
      case 1: { // fixed64
        if (offset + 8 > bytes.length) throw new Error('Unexpected end of data')
        const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8)
        value = view.getBigUint64(0, true)
        offset += 8
        break
      }
      case 2: { // length-delimited
        const [len, next] = decodeVarint(bytes, offset)
        offset = next
        const length = Number(len)
        if (offset + length > bytes.length) throw new Error('Unexpected end of data')
        const data = bytes.slice(offset, offset + length)
        offset += length

        // Try to decode as nested message
        try {
          const nested = tryDecodeProtobuf(data)
          if (nested.length > 0) {
            value = nested
            break
          }
        } catch {
          // Not a nested message
        }

        // Try to decode as UTF-8 string
        try {
          const text = new TextDecoder('utf-8', { fatal: true }).decode(data)
          if (/^[\x20-\x7e\t\n\r]*$/.test(text)) {
            value = text
            break
          }
        } catch {
          // Not valid UTF-8
        }

        // Raw bytes
        value = `[bytes: ${data.length}]`
        break
      }
      case 5: { // fixed32
        if (offset + 4 > bytes.length) throw new Error('Unexpected end of data')
        const view32 = new DataView(bytes.buffer, bytes.byteOffset + offset, 4)
        value = view32.getUint32(0, true)
        offset += 4
        break
      }
      default:
        throw new Error(`Unknown wire type: ${wireType}`)
    }

    fields.push({ fieldNumber, wireType, wireTypeName, value })
  }

  return fields
}

function fieldsToObject(fields: ProtobufField[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    const key = `field_${field.fieldNumber} (${field.wireTypeName})`
    const value = Array.isArray(field.value)
      ? fieldsToObject(field.value as ProtobufField[])
      : field.value
    if (key in result) {
      // Repeated field
      const existing = result[key]
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        result[key] = [existing, value]
      }
    } else {
      result[key] = value
    }
  }
  return result
}

export const protobufDecoder: Decoder = {
  id: 'protobuf',
  label: 'Protobuf',
  priority: 40,
  supportsBinary: true,
  supportsText: false,

  detect(input: DecoderInput): DetectResult {
    if (!input.binary) return { confident: false, confidence: 0 }

    try {
      const bytes = new Uint8Array(input.binary)
      if (bytes.length === 0) return { confident: false, confidence: 0 }

      // Check if first byte has valid wire type
      const wireType = bytes[0] & 0x07
      if (!(wireType in WIRE_TYPES)) return { confident: false, confidence: 0 }

      const fields = tryDecodeProtobuf(bytes)
      if (fields.length > 0) {
        return { confident: true, confidence: 0.4 }
      }
      return { confident: false, confidence: 0 }
    } catch {
      return { confident: false, confidence: 0 }
    }
  },

  decode(input: DecoderInput): DecodeResult {
    const bytes = new Uint8Array(input.binary!)
    const fields = tryDecodeProtobuf(bytes)
    const data = fieldsToObject(fields)

    return {
      format: 'protobuf',
      formatLabel: 'Protocol Buffers (schema-less)',
      data,
      metadata: {
        protobuf: {
          fieldCount: fields.length,
          hasSchema: false,
        },
      },
      raw: `[Binary: ${input.binary!.byteLength} bytes]`,
    }
  },
}
