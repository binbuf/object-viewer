import { useState, useMemo, useCallback } from 'react'
import { Search, X, ArrowRight } from 'lucide-react'
import Modal from '../Modal/Modal.tsx'
import type { TreeNode } from '../TreeView/types.ts'
import { buildTree, flattenTree, getNodePath, prefixTreeIds } from '../../utils/treeBuilder.ts'

interface SearchResultsProps {
  open: boolean
  onClose: () => void
  data: unknown
  isMultiDocument?: boolean
  onNavigate: (nodeId: string) => void
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  string: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  number: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  boolean: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  null: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  object: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  array: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

function truncateValue(node: TreeNode): string {
  if (node.type === 'object') return `{${node.childCount ?? 0} keys}`
  if (node.type === 'array') return `[${node.childCount ?? 0} items]`
  if (node.type === 'string') {
    const str = node.value as string
    return str.length > 80 ? `"${str.slice(0, 80)}..."` : `"${str}"`
  }
  if (node.type === 'null') return 'null'
  return String(node.value)
}

function collectAllIds(node: TreeNode): string[] {
  const ids: string[] = [node.id]
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectAllIds(child))
    }
  }
  return ids
}

export default function SearchResults({ open, onClose, data, isMultiDocument, onNavigate }: SearchResultsProps) {
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [useRegex, setUseRegex] = useState(false)

  const allNodes = useMemo(() => {
    if (isMultiDocument && Array.isArray(data)) {
      const nodes: ReturnType<typeof flattenTree> = []
      data.forEach((item, i) => {
        const prefix = `doc${i}.`
        const tree = prefixTreeIds(buildTree(item), prefix)
        const allIds = collectAllIds(tree)
        nodes.push(...flattenTree(tree, new Set(allIds)))
      })
      return nodes
    }
    const tree = buildTree(data)
    const allIds = collectAllIds(tree)
    return flattenTree(tree, new Set(allIds))
  }, [data, isMultiDocument])

  const results = useMemo(() => {
    if (!query.trim()) return []

    let matcher: (text: string) => boolean

    if (useRegex) {
      try {
        const re = new RegExp(query, caseSensitive ? '' : 'i')
        matcher = (text: string) => re.test(text)
      } catch {
        return [] // Invalid regex
      }
    } else {
      const q = caseSensitive ? query : query.toLowerCase()
      matcher = (text: string) => {
        const t = caseSensitive ? text : text.toLowerCase()
        return t.includes(q)
      }
    }

    return allNodes.filter(node => {
      const keyStr = String(node.key)
      if (matcher(keyStr)) return true
      if (node.type !== 'object' && node.type !== 'array') {
        if (matcher(String(node.value))) return true
      }
      return false
    })
  }, [allNodes, query, caseSensitive, useRegex])

  const handleNavigate = useCallback((nodeId: string) => {
    onNavigate(nodeId)
    onClose()
  }, [onNavigate, onClose])

  return (
    <Modal open={open} onClose={onClose} title="Search Results" wide>
      <div className="flex flex-col h-[70vh]">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search keys and values..."
            className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${caseSensitive ? 'border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-600' : 'border-gray-300 dark:border-gray-600 text-gray-500'}`}
            title="Case sensitive"
          >
            Aa
          </button>
          <button
            onClick={() => setUseRegex(!useRegex)}
            className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${useRegex ? 'border-blue-400 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-600' : 'border-gray-300 dark:border-gray-600 text-gray-500'}`}
            title="Regular expression"
          >
            .*
          </button>
          {query && (
            <button onClick={() => setQuery('')} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Match count */}
        {query && (
          <div className="px-4 py-1.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            {results.length.toLocaleString()} match{results.length !== 1 ? 'es' : ''} found
          </div>
        )}

        {/* Results list */}
        <div className="flex-1 overflow-auto">
          {results.length === 0 && query && (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No matches found
            </div>
          )}
          {results.map(node => (
            <button
              key={node.id}
              onClick={() => handleNavigate(node.id)}
              className="w-full flex items-start gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-1 rounded flex-shrink-0 ${TYPE_BADGE_COLORS[node.type] || 'bg-gray-100 text-gray-600'}`}>
                    {node.type}
                  </span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {String(node.key)}
                  </span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate">
                  {getNodePath(node)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                  {truncateValue(node)}
                </div>
              </div>
              <ArrowRight size={14} className="text-gray-400 flex-shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
