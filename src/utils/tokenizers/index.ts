import type { FormatId } from '../../decoders/types.ts'
import type { SourceToken } from './types.ts'
import { tokenizeJson } from './json.ts'
import { tokenizeYaml } from './yaml.ts'
import { tokenizeXml } from './xml.ts'
import { tokenizeJwt } from './jwt.ts'

export type { SourceToken } from './types.ts'
export { TOKEN_COLORS } from './types.ts'

export function tokenizeSource(source: string, format: FormatId): SourceToken[] | null {
  switch (format) {
    case 'json':
    case 'json5':
      return tokenizeJson(source)
    case 'yaml':
      return tokenizeYaml(source)
    case 'xml':
      return tokenizeXml(source)
    case 'jwt':
      return tokenizeJwt(source)
    default:
      // Binary formats: msgpack, cbor, protobuf
      return null
  }
}
