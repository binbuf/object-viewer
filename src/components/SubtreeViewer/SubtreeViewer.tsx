import { useState } from 'react'
import Modal from '../Modal/Modal.tsx'
import TreeView from '../TreeView/TreeView.tsx'
import SearchBar from '../SearchBar/SearchBar.tsx'
import type { TreeNode } from '../TreeView/types.ts'
import { getNodePath } from '../../utils/treeBuilder.ts'

interface SubtreeViewerProps {
  node: TreeNode | null
  open: boolean
  onClose: () => void
}

export default function SubtreeViewer({ node, open, onClose }: SubtreeViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')

  if (!node) return null

  const path = getNodePath(node)
  const title = `Subtree: ${path} (${node.type}${node.childCount != null ? `, ${node.childCount} items` : ''})`

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="flex flex-col h-[70vh]">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <div className="flex-1 min-h-0">
          <TreeView data={node.value} searchQuery={searchQuery} />
        </div>
      </div>
    </Modal>
  )
}
