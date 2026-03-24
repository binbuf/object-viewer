import type { TreeNode, NodeType } from '../components/TreeView/types.ts'

const MAX_DEPTH = 50

function getNodeType(value: unknown): NodeType {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'bigint') return 'bigint'
  if (value instanceof Date) return 'date'
  if (value instanceof ArrayBuffer || value instanceof Uint8Array) return 'binary'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'string'
}

function buildPath(parentPath: string[], key: string | number): string[] {
  return [...parentPath, String(key)]
}

function pathToId(path: string[]): string {
  return path.length === 0 ? 'root' : path.join('.')
}

function buildNode(
  key: string | number,
  value: unknown,
  depth: number,
  parentPath: string[],
  seen: WeakSet<object>,
): TreeNode {
  const path = parentPath.length === 0 && key === 'root' ? [] : buildPath(parentPath, key)
  const type = getNodeType(value)
  const id = path.length === 0 ? 'root' : pathToId(path)

  const node: TreeNode = { id, key, value, type, depth, path }

  if (depth >= MAX_DEPTH) return node

  if (type === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    if (seen.has(value as object)) {
      node.value = '[Circular Reference]'
      node.type = 'string'
      return node
    }
    seen.add(value as object)

    const entries = Object.entries(value as Record<string, unknown>)
    node.childCount = entries.length
    node.children = entries.map(([k, v]) => buildNode(k, v, depth + 1, path, seen))
  } else if (type === 'array' && Array.isArray(value)) {
    if (seen.has(value)) {
      node.value = '[Circular Reference]'
      node.type = 'string'
      return node
    }
    seen.add(value)

    node.childCount = value.length
    node.children = value.map((item, index) => buildNode(index, item, depth + 1, path, seen))
  }

  return node
}

export function buildTree(data: unknown): TreeNode {
  return buildNode('root', data, 0, [], new WeakSet())
}

export function flattenTree(root: TreeNode, expandedIds: Set<string>): TreeNode[] {
  const result: TreeNode[] = []

  function walk(node: TreeNode) {
    result.push(node)
    if (node.children && expandedIds.has(node.id)) {
      for (const child of node.children) {
        walk(child)
      }
    }
  }

  walk(root)
  return result
}

export function prefixTreeIds(node: TreeNode, prefix: string): TreeNode {
  return {
    ...node,
    id: `${prefix}${node.id}`,
    children: node.children?.map(child => prefixTreeIds(child, prefix)),
  }
}

export function getNodePath(node: TreeNode): string {
  if (node.path.length === 0) return '$'
  return '$.' + node.path.map(segment => {
    if (/^\d+$/.test(segment)) return `[${segment}]`
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(segment)) return segment
    return `["${segment}"]`
  }).join('.').replace(/\.\[/g, '[')
}
