import { useState, useCallback } from 'react'
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react'
import type { TreeNode } from './types.ts'
import { getNodePath } from '../../utils/treeBuilder.ts'

interface TreeNodeRowProps {
  node: TreeNode
  isExpanded: boolean
  onToggle: (id: string) => void
  searchMatch?: boolean
}

const TYPE_COLORS: Record<string, string> = {
  string: 'text-green-600 dark:text-green-400',
  number: 'text-blue-600 dark:text-blue-400',
  boolean: 'text-purple-600 dark:text-purple-400',
  null: 'text-gray-500 dark:text-gray-400',
  undefined: 'text-gray-500 dark:text-gray-400',
  bigint: 'text-blue-600 dark:text-blue-400',
  date: 'text-amber-600 dark:text-amber-400',
  binary: 'text-red-600 dark:text-red-400',
  object: 'text-gray-700 dark:text-gray-300',
  array: 'text-gray-700 dark:text-gray-300',
}

const TYPE_BADGES: Record<string, string> = {
  string: 'str',
  number: 'num',
  boolean: 'bool',
  null: 'null',
  undefined: 'undef',
  bigint: 'bigint',
  date: 'date',
  binary: 'bin',
  object: 'obj',
  array: 'arr',
}

const BADGE_COLORS: Record<string, string> = {
  string: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  number: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  boolean: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  null: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  undefined: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  bigint: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  date: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  binary: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  object: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  array: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

function formatValue(node: TreeNode): string {
  if (node.type === 'object') return `{${node.childCount ?? 0} keys}`
  if (node.type === 'array') return `[${node.childCount ?? 0} items]`
  if (node.type === 'string') {
    const str = node.value as string
    return str.length > 120 ? `"${str.slice(0, 120)}..."` : `"${str}"`
  }
  if (node.type === 'null') return 'null'
  if (node.type === 'undefined') return 'undefined'
  if (node.type === 'boolean') return String(node.value)
  if (node.type === 'number' || node.type === 'bigint') return String(node.value)
  if (node.type === 'date') return (node.value as Date).toISOString()
  return String(node.value)
}

export default function TreeNodeRow({ node, isExpanded, onToggle, searchMatch }: TreeNodeRowProps) {
  const [copied, setCopied] = useState<'path' | 'value' | null>(null)
  const hasChildren = Boolean(node.children && node.children.length > 0)

  const handleCopy = useCallback(async (type: 'path' | 'value') => {
    const text = type === 'path'
      ? getNodePath(node)
      : (node.type === 'object' || node.type === 'array')
        ? JSON.stringify(node.value, null, 2)
        : String(node.value)

    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 1500)
  }, [node])

  return (
    <div
      className={`group flex items-center h-7 px-2 hover:bg-gray-100 dark:hover:bg-gray-800 font-mono text-sm cursor-default select-none ${searchMatch ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}`}
      style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
    >
      {/* Expand/Collapse */}
      <span
        className="w-4 h-4 flex items-center justify-center flex-shrink-0 cursor-pointer"
        onClick={() => hasChildren && onToggle(node.id)}
      >
        {hasChildren ? (
          isExpanded
            ? <ChevronDown size={14} className="text-gray-500" />
            : <ChevronRight size={14} className="text-gray-500" />
        ) : null}
      </span>

      {/* Key */}
      <span className="text-gray-800 dark:text-gray-200 ml-1 flex-shrink-0">
        {typeof node.key === 'number' ? (
          <span className="text-gray-500 dark:text-gray-400">{node.key}</span>
        ) : (
          <span>{node.key}</span>
        )}
      </span>

      <span className="text-gray-400 mx-1 flex-shrink-0">:</span>

      {/* Type badge */}
      <span className={`text-[10px] px-1 rounded mr-1.5 flex-shrink-0 ${BADGE_COLORS[node.type] || ''}`}>
        {TYPE_BADGES[node.type] || node.type}
      </span>

      {/* Value */}
      <span className={`truncate ${TYPE_COLORS[node.type] || ''}`}>
        {formatValue(node)}
      </span>

      {/* Copy buttons */}
      <span className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0 pl-2">
        <button
          onClick={() => handleCopy('path')}
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Copy path"
        >
          {copied === 'path' ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-400" />}
        </button>
        <button
          onClick={() => handleCopy('value')}
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title="Copy value"
        >
          {copied === 'value' ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-gray-400" />}
        </button>
      </span>
    </div>
  )
}
