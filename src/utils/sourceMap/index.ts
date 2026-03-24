import type { FormatId } from '../../decoders/types.ts'
import type { SourceMap } from './types.ts'
import { buildJsonSourceMap } from './json.ts'
import { buildYamlSourceMap } from './yaml.ts'
import { buildXmlSourceMap } from './xml.ts'
import { buildJwtSourceMap } from './jwt.ts'

export { findNodeAtOffset, findSpanForNode } from './findNode.ts'
export type { SourceMap, SourceSpan } from './types.ts'

export function buildSourceMap(source: string, format: FormatId, isMultiDocument: boolean): SourceMap | null {
  try {
    switch (format) {
      case 'json':
      case 'json5':
        return buildJsonSourceMap(source, isMultiDocument)
      case 'yaml':
        return buildYamlSourceMap(source, isMultiDocument)
      case 'xml':
        return buildXmlSourceMap(source)
      case 'jwt':
        return buildJwtSourceMap(source)
      default:
        // Binary formats: msgpack, cbor, protobuf
        return null
    }
  } catch {
    return null
  }
}
