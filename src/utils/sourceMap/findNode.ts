import type { SourceMap, SourceSpan } from './types.ts'

export function findNodeAtOffset(map: SourceMap, offset: number): string | null {
  let best: string | null = null
  let bestDepth = -1

  for (const span of map) {
    if (offset >= span.startOffset && offset < span.endOffset && span.depth > bestDepth) {
      best = span.nodeId
      bestDepth = span.depth
    }
  }

  return best
}

export function findSpanForNode(map: SourceMap, nodeId: string): SourceSpan | null {
  let best: SourceSpan | null = null
  let bestDepth = -1

  for (const span of map) {
    if (span.nodeId === nodeId && span.depth > bestDepth) {
      best = span
      bestDepth = span.depth
    }
  }

  return best
}
