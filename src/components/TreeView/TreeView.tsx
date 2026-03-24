import { useState, useMemo, useCallback } from 'react'
import type { TreeNode as TreeNodeType } from './types.ts'
import { buildTree, flattenTree } from '../../utils/treeBuilder.ts'
import TreeNodeRow from './TreeNodeRow.tsx'

interface TreeViewProps {
  data: unknown
  searchQuery?: string
}

function matchesSearch(node: TreeNodeType, query: string): boolean {
  if (!query) return false
  const lower = query.toLowerCase()
  const keyStr = String(node.key).toLowerCase()
  if (keyStr.includes(lower)) return true
  if (node.type !== 'object' && node.type !== 'array') {
    const valStr = String(node.value).toLowerCase()
    if (valStr.includes(lower)) return true
  }
  return false
}

function collectAllIds(node: TreeNodeType): string[] {
  const ids: string[] = [node.id]
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectAllIds(child))
    }
  }
  return ids
}

function collectAncestorIds(root: TreeNodeType, matchingIds: Set<string>): Set<string> {
  const ancestors = new Set<string>()

  function walk(node: TreeNodeType, parentIds: string[]) {
    if (matchingIds.has(node.id)) {
      for (const pid of parentIds) {
        ancestors.add(pid)
      }
    }
    if (node.children) {
      for (const child of node.children) {
        walk(child, [...parentIds, node.id])
      }
    }
  }

  walk(root, [])
  return ancestors
}

export default function TreeView({ data, searchQuery }: TreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(['root']))

  const tree = useMemo(() => buildTree(data), [data])

  // Search matching
  const searchMatchIds = useMemo(() => {
    if (!searchQuery?.trim()) return new Set<string>()
    const allNodes = collectAllIds(tree)
    const matches = new Set<string>()
    const allFlat = flattenTree(tree, new Set(allNodes))
    for (const node of allFlat) {
      if (matchesSearch(node, searchQuery)) {
        matches.add(node.id)
      }
    }
    return matches
  }, [tree, searchQuery])

  // Auto-expand to show search results
  const effectiveExpandedIds = useMemo(() => {
    if (searchMatchIds.size === 0) return expandedIds
    const ancestors = collectAncestorIds(tree, searchMatchIds)
    return new Set([...expandedIds, ...ancestors])
  }, [expandedIds, searchMatchIds, tree])

  const visibleNodes = useMemo(
    () => flattenTree(tree, effectiveExpandedIds),
    [tree, effectiveExpandedIds],
  )

  const toggleNode = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(collectAllIds(tree)))
  }, [tree])

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set(['root']))
  }, [])

  const matchCount = searchMatchIds.size

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 text-xs">
        <button
          onClick={expandAll}
          className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          Collapse All
        </button>
        {searchQuery && (
          <span className="ml-auto text-gray-500 dark:text-gray-400">
            {matchCount} match{matchCount !== 1 ? 'es' : ''}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {visibleNodes.map(node => (
          <TreeNodeRow
            key={node.id}
            node={node}
            isExpanded={effectiveExpandedIds.has(node.id)}
            onToggle={toggleNode}
            searchMatch={searchMatchIds.has(node.id)}
          />
        ))}
      </div>
    </div>
  )
}
