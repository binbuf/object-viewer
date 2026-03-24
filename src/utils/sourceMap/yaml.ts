import * as YAML from 'yaml'
import type { SourceSpan, SourceMap } from './types.ts'

export function buildYamlSourceMap(source: string, isMultiDocument: boolean): SourceMap {
  const spans: SourceSpan[] = []

  try {
    if (isMultiDocument) {
      const docs = YAML.parseAllDocuments(source)
      docs.forEach((doc, i) => {
        const prefix = `doc${i}.`
        if (doc.contents) {
          walkNode(doc.contents, [], prefix, 0, spans)
        }
      })
    } else {
      const doc = YAML.parseDocument(source)
      if (doc.contents) {
        walkNode(doc.contents, [], '', 0, spans)
      }
    }
  } catch {
    // If YAML parsing fails, return empty map
  }

  return spans
}

function walkNode(node: YAML.Node, path: string[], prefix: string, depth: number, spans: SourceSpan[]) {
  const nodeId = prefix + (path.length === 0 ? 'root' : path.join('.'))
  const range = node.range

  if (range) {
    spans.push({
      startOffset: range[0],
      endOffset: range[1],
      nodeId,
      depth,
    })
  }

  if (YAML.isMap(node)) {
    for (const pair of node.items) {
      const key = YAML.isScalar(pair.key) ? String(pair.key.value) : String(pair.key)
      const childPath = path.length === 0 ? [key] : [...path, key]
      if (pair.value && YAML.isNode(pair.value)) {
        walkNode(pair.value, childPath, prefix, depth + 1, spans)
      }
    }
  } else if (YAML.isSeq(node)) {
    node.items.forEach((item, index) => {
      const childPath = path.length === 0 ? [String(index)] : [...path, String(index)]
      if (YAML.isNode(item)) {
        walkNode(item, childPath, prefix, depth + 1, spans)
      }
    })
  }
}
