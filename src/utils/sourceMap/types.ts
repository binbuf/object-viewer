export interface SourceSpan {
  startOffset: number  // inclusive char offset
  endOffset: number    // exclusive
  nodeId: string       // TreeNode.id
  depth: number        // nesting depth, for finding deepest match
}

export type SourceMap = SourceSpan[]
