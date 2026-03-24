import YAML from 'yaml'
import { XMLBuilder } from 'fast-xml-parser'
import type { FormatId } from '../decoders/types.ts'

export type ConvertTargetId = 'json' | 'yaml' | 'xml'

const TARGET_MAP: Record<FormatId, ConvertTargetId[]> = {
  json: ['yaml', 'xml'],
  json5: ['json', 'yaml', 'xml'],
  jwt: ['json', 'yaml', 'xml'],
  xml: ['json', 'yaml'],
  yaml: ['json', 'xml'],
  msgpack: ['json', 'yaml', 'xml'],
  cbor: ['json', 'yaml', 'xml'],
  protobuf: ['json', 'yaml', 'xml'],
}

export function getConversionTargets(sourceFormat: FormatId): ConvertTargetId[] {
  return TARGET_MAP[sourceFormat] ?? []
}

function toJson(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

function toYaml(data: unknown, isMultiDocument: boolean): string {
  if (isMultiDocument && Array.isArray(data)) {
    return data
      .map(item => YAML.stringify(item).trim())
      .filter(Boolean)
      .join('\n---\n')
  }
  return YAML.stringify(data).trim()
}

function wrapForXml(data: unknown): Record<string, unknown> {
  if (data == null || typeof data !== 'object') {
    return { root: { '#text': data == null ? '' : String(data) } }
  }
  if (Array.isArray(data)) {
    return { root: { item: data } }
  }
  const keys = Object.keys(data)
  if (keys.length === 1) {
    return data as Record<string, unknown>
  }
  return { root: data }
}

function toXml(data: unknown, isMultiDocument: boolean): string {
  const builder = new XMLBuilder({
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    ignoreAttributes: false,
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
  })

  const wrapped = isMultiDocument && Array.isArray(data)
    ? { root: { item: data } }
    : wrapForXml(data)

  const xml = builder.build(wrapped) as string
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`.trim()
}

export function convertData(data: unknown, target: ConvertTargetId, isMultiDocument = false): string {
  switch (target) {
    case 'json':
      return toJson(data)
    case 'yaml':
      return toYaml(data, isMultiDocument)
    case 'xml':
      return toXml(data, isMultiDocument)
  }
}
