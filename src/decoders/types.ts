export type FormatId = 'json' | 'json5' | 'jwt' | 'xml' | 'yaml' | 'msgpack' | 'cbor' | 'protobuf'

export interface DecoderInput {
  text?: string
  binary?: ArrayBuffer
  source: 'paste' | 'file' | 'url'
  fileName?: string
}

export interface JwtMetadata {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  signature: string
  isExpired: boolean
  expiresAt?: Date
  issuedAt?: Date
  algorithm?: string
}

export interface XmlMetadata {
  rootElement: string
  namespaces: Record<string, string>
  declaration?: Record<string, string>
}

export interface ProtobufMetadata {
  fieldCount: number
  hasSchema: boolean
}

export interface FormatMetadata {
  jwt?: JwtMetadata
  xml?: XmlMetadata
  protobuf?: ProtobufMetadata
}

export interface DecodeResult {
  format: FormatId
  formatLabel: string
  data: unknown
  metadata: FormatMetadata
  raw: string
  warnings?: string[]
  itemCount?: number
  isMultiDocument?: boolean
}

export interface DecodeError {
  message: string
  detail?: string
  format?: FormatId
  position?: { line: number; column: number }
}

export interface DetectResult {
  confident: boolean
  confidence: number
}

export interface Decoder {
  id: FormatId
  label: string
  priority: number
  supportsBinary: boolean
  supportsText: boolean
  detect(input: DecoderInput): DetectResult
  decode(input: DecoderInput): DecodeResult
}
