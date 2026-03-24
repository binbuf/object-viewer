import type { SourceSpan, SourceMap } from './types.ts'
import { buildJsonSourceMap } from './json.ts'

export function buildJwtSourceMap(source: string): SourceMap {
  const spans: SourceSpan[] = []
  const trimmed = source.trim()
  const offset = source.indexOf(trimmed)
  const parts = trimmed.split('.')

  if (parts.length < 2) return spans

  let pos = offset

  // Header segment
  spans.push({ startOffset: pos, endOffset: pos + parts[0].length, nodeId: 'header', depth: 1 })
  addDecodedSpans(parts[0], pos, 'header', spans)
  pos += parts[0].length + 1 // +1 for dot

  // Payload segment
  spans.push({ startOffset: pos, endOffset: pos + parts[1].length, nodeId: 'payload', depth: 1 })
  addDecodedSpans(parts[1], pos, 'payload', spans)
  pos += parts[1].length + 1 // +1 for dot

  // Signature segment (if present)
  if (parts.length > 2) {
    const sig = parts.slice(2).join('.')
    spans.push({ startOffset: pos, endOffset: pos + sig.length, nodeId: 'signature', depth: 1 })
  }

  // Root span covers everything
  spans.push({ startOffset: offset, endOffset: offset + trimmed.length, nodeId: 'root', depth: 0 })

  return spans
}

function addDecodedSpans(base64Part: string, _segmentOffset: number, _parentId: string, _spans: SourceSpan[]) {
  // Try to decode and map sub-properties of JWT header/payload
  // The base64 positions don't map cleanly to JSON positions, so we only map top-level
  try {
    const json = atob(base64Part.replace(/-/g, '+').replace(/_/g, '/'))
    const parsed = JSON.parse(json)
    if (typeof parsed === 'object' && parsed !== null) {
      // We have the decoded object but can't map byte-for-byte back to base64
      // So we keep navigation at the header/payload level
      const subMap = buildJsonSourceMap(json, false)
      // These spans reference the decoded JSON, not the source, so we don't add them
      void subMap
    }
  } catch {
    // Not valid base64 JSON
  }
}
