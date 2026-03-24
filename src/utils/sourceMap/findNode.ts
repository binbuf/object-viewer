import type { SourceMap } from './types.ts'

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
