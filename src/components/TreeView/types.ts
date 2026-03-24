export type NodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'bigint' | 'date' | 'binary' | 'undefined'

export interface TreeNode {
  id: string
  key: string | number
  value: unknown
  type: NodeType
  children?: TreeNode[]
  depth: number
  path: string[]
  childCount?: number
}
