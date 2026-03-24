import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import Modal from '../Modal/Modal.tsx'
import type { TreeNode } from '../TreeView/types.ts'
import { getNodePath } from '../../utils/treeBuilder.ts'

interface ValueViewerProps {
  node: TreeNode | null
  open: boolean
  onClose: () => void
}

function getDisplayValue(node: TreeNode): string {
  if (node.type === 'object' || node.type === 'array') {
    try {
      return JSON.stringify(node.value, null, 2)
    } catch {
      return String(node.value)
    }
  }
  if (node.type === 'null') return 'null'
  if (node.type === 'undefined') return 'undefined'
  if (node.type === 'date') return (node.value as Date).toISOString()
  return String(node.value)
}

export default function ValueViewer({ node, open, onClose }: ValueViewerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!node) return
    await navigator.clipboard.writeText(getDisplayValue(node))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [node])

  if (!node) return null

  const path = getNodePath(node)
  const value = getDisplayValue(node)

  return (
    <Modal open={open} onClose={onClose} title={`${path} (${node.type})`} wide={node.type === 'object' || node.type === 'array'}>
      <div className="flex flex-col h-full">
        {/* Actions bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{path}</span>
          <button
            onClick={handleCopy}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {/* Value display */}
        <pre className="flex-1 overflow-auto p-4 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
          {value}
        </pre>
      </div>
    </Modal>
  )
}
