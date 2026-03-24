import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Copy, Key, Braces, MapPin, Maximize2, GitBranch, FileText, Clock } from 'lucide-react'
import type { TreeNode as TreeNodeType } from './types.ts'
import { buildTree, flattenTree, getNodePath, prefixTreeIds } from '../../utils/treeBuilder.ts'
import TreeNodeRow from './TreeNodeRow.tsx'
import ContextMenu, { type ContextMenuItem } from '../ContextMenu/ContextMenu.tsx'
import { useTimezone } from '../../hooks/useTimezone.tsx'
import { TIMEZONE_GROUPS } from '../../utils/timestamp.ts'

interface TreeViewProps {
  data: unknown
  searchQuery?: string
  focusedNodeId?: string | null
  isMultiDocument?: boolean
  onExpandValue?: (node: TreeNodeType) => void
  onViewSubtree?: (node: TreeNodeType) => void
  onNodeClick?: (nodeId: string) => void
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

interface DocumentSection {
  index: number
  label: string
  tree: TreeNodeType
}

export default function TreeView({ data, searchQuery, focusedNodeId, isMultiDocument, onExpandValue, onViewSubtree, onNodeClick }: TreeViewProps) {
  const { timezone, setTimezone, timestampsEnabled, setTimestampsEnabled } = useTimezone()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(['root']))
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNodeType } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build document sections (multi-doc) or single tree
  const documents = useMemo((): DocumentSection[] => {
    if (isMultiDocument && Array.isArray(data)) {
      return data.map((item, i) => {
        const prefix = `doc${i}.`
        const tree = prefixTreeIds(buildTree(item), prefix)
        return { index: i, label: `Object ${i + 1}`, tree }
      })
    }
    return [{ index: 0, label: '', tree: buildTree(data) }]
  }, [data, isMultiDocument])

  // Set initial expanded state for all doc roots
  useEffect(() => {
    if (isMultiDocument) {
      const roots = new Set(documents.map(d => d.tree.id))
      roots.add('root')
      setExpandedIds(roots)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiDocument, documents.length])

  // Search matching across all documents
  const searchMatchIds = useMemo(() => {
    if (!searchQuery?.trim()) return new Set<string>()
    const matches = new Set<string>()
    for (const doc of documents) {
      const allIds = collectAllIds(doc.tree)
      const allFlat = flattenTree(doc.tree, new Set(allIds))
      for (const node of allFlat) {
        if (matchesSearch(node, searchQuery)) {
          matches.add(node.id)
        }
      }
    }
    return matches
  }, [documents, searchQuery])

  // Auto-expand for search and focused node
  const effectiveExpandedIds = useMemo(() => {
    let ids = expandedIds

    if (searchMatchIds.size > 0) {
      for (const doc of documents) {
        const ancestors = collectAncestorIds(doc.tree, searchMatchIds)
        ids = new Set([...ids, ...ancestors])
      }
    }

    if (focusedNodeId) {
      const focusedSet = new Set([focusedNodeId])
      for (const doc of documents) {
        const ancestors = collectAncestorIds(doc.tree, focusedSet)
        ids = new Set([...ids, ...ancestors])
      }
    }

    return ids
  }, [expandedIds, searchMatchIds, documents, focusedNodeId])

  // Flatten visible nodes per document
  const documentRows = useMemo(() => {
    return documents.map(doc => ({
      ...doc,
      visibleNodes: flattenTree(doc.tree, effectiveExpandedIds),
    }))
  }, [documents, effectiveExpandedIds])

  // Scroll to focused node
  useEffect(() => {
    if (!focusedNodeId || !containerRef.current) return
    // Find the row across all documents
    let cumulativeIndex = 0
    for (const doc of documentRows) {
      if (isMultiDocument) cumulativeIndex++ // account for section header
      const idx = doc.visibleNodes.findIndex(n => n.id === focusedNodeId)
      if (idx >= 0) {
        const rowHeight = 28
        const targetIndex = cumulativeIndex + idx
        containerRef.current.scrollTop = Math.max(0, targetIndex * rowHeight - containerRef.current.clientHeight / 2)
        return
      }
      cumulativeIndex += doc.visibleNodes.length
    }
  }, [focusedNodeId, documentRows, isMultiDocument])

  const toggleNode = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    const allIds = new Set<string>()
    for (const doc of documents) {
      for (const id of collectAllIds(doc.tree)) {
        allIds.add(id)
      }
    }
    setExpandedIds(allIds)
  }, [documents])

  const collapseAll = useCallback(() => {
    const roots = new Set(documents.map(d => d.tree.id))
    roots.add('root')
    setExpandedIds(roots)
  }, [documents])

  const handleContextMenu = useCallback((e: React.MouseEvent, node: TreeNodeType) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }, [])

  const handleExpandValue = useCallback((node: TreeNodeType) => {
    onExpandValue?.(node)
  }, [onExpandValue])

  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    if (!contextMenu) return []
    const node = contextMenu.node
    const isComplex = node.type === 'object' || node.type === 'array'

    const items: ContextMenuItem[] = [
      {
        label: 'Copy Key',
        icon: <Key size={14} />,
        onClick: () => navigator.clipboard.writeText(String(node.key)),
      },
      {
        label: 'Copy Value',
        icon: <Copy size={14} />,
        onClick: () => {
          const text = isComplex ? JSON.stringify(node.value, null, 2) : String(node.value)
          navigator.clipboard.writeText(text)
        },
      },
      {
        label: 'Copy Path',
        icon: <MapPin size={14} />,
        onClick: () => navigator.clipboard.writeText(getNodePath(node)),
      },
    ]

    if (isComplex) {
      items.push({
        label: 'Copy Object',
        icon: <Braces size={14} />,
        onClick: () => navigator.clipboard.writeText(JSON.stringify(node.value, null, 2)),
      })
    }

    items.push({ label: '', onClick: () => {}, separator: true })

    items.push({
      label: 'Expand Value',
      icon: <Maximize2 size={14} />,
      onClick: () => onExpandValue?.(node),
    })

    if (isComplex) {
      items.push({
        label: 'View Subtree',
        icon: <GitBranch size={14} />,
        onClick: () => onViewSubtree?.(node),
      })
    }

    return items
  }, [contextMenu, onExpandValue, onViewSubtree])

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
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setTimestampsEnabled(!timestampsEnabled)}
            className={`p-1 rounded ${timestampsEnabled ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}
            title={timestampsEnabled ? 'Disable timestamp detection' : 'Enable timestamp detection'}
          >
            <Clock size={12} />
          </button>
          {timestampsEnabled && (
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
            >
              <option value="local">Local</option>
              <option value="UTC">UTC</option>
              {TIMEZONE_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
          {searchQuery && (
            <span className="text-gray-500 dark:text-gray-400">
              {matchCount} match{matchCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto">
        {documentRows.map((doc) => (
          <div key={doc.index}>
            {/* Document section header — only in multi-document mode */}
            {isMultiDocument && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-[1]">
                <FileText size={12} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {doc.label}
                </span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-700 ml-2" />
              </div>
            )}
            {doc.visibleNodes.map(node => (
              <TreeNodeRow
                key={node.id}
                node={node}
                isExpanded={effectiveExpandedIds.has(node.id)}
                isFocused={node.id === focusedNodeId}
                onToggle={toggleNode}
                onContextMenu={handleContextMenu}
                onExpandValue={handleExpandValue}
                onNodeClick={onNodeClick}
                searchMatch={searchMatchIds.has(node.id)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
