import { useState, useCallback, useMemo } from 'react'
import Toolbar from './components/Toolbar/Toolbar.tsx'
import InputArea from './components/InputArea/InputArea.tsx'
import TreeView from './components/TreeView/TreeView.tsx'
import SearchBar from './components/SearchBar/SearchBar.tsx'
import Breadcrumbs from './components/Breadcrumbs/Breadcrumbs.tsx'
import ValueViewer from './components/ValueViewer/ValueViewer.tsx'
import SubtreeViewer from './components/SubtreeViewer/SubtreeViewer.tsx'
import SearchResults from './components/SearchResults/SearchResults.tsx'
import { useTheme } from './hooks/useTheme.ts'
import { useDecoder } from './hooks/useDecoder.ts'
import { tokenizeSource } from './utils/tokenizers/index.ts'
import { buildSourceMap, findNodeAtOffset } from './utils/sourceMap/index.ts'
import type { TreeNode } from './components/TreeView/types.ts'
import { AlertTriangle } from 'lucide-react'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const { input, result, error, overrideFormat, setInput, setFormat, processFile, refresh, clear } = useDecoder()
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [expandedValueNode, setExpandedValueNode] = useState<TreeNode | null>(null)
  const [subtreeNode, setSubtreeNode] = useState<TreeNode | null>(null)
  const [searchResultsOpen, setSearchResultsOpen] = useState(false)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)

  const handleNavigateToNode = useCallback((nodeId: string) => {
    setFocusedNodeId(nodeId)
    // Clear focus after a few seconds
    setTimeout(() => setFocusedNodeId(null), 3000)
  }, [])

  const tokens = useMemo(() => {
    if (!result || !input) return null
    return tokenizeSource(input, result.format)
  }, [result, input])

  const sourceMap = useMemo(() => {
    if (!result || !input) return null
    return buildSourceMap(input, result.format, result.isMultiDocument ?? false)
  }, [result, input])

  const handleSourceClick = useCallback((offset: number) => {
    if (!sourceMap) return
    const nodeId = findNodeAtOffset(sourceMap, offset)
    if (nodeId) handleNavigateToNode(nodeId)
  }, [sourceMap, handleNavigateToNode])

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Toolbar theme={theme} onToggleTheme={toggleTheme} onRefresh={refresh} />

      <div className="flex-1 flex min-h-0">
        {/* Left panel: Input */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700 min-w-0">
          <InputArea
            value={input}
            onChange={setInput}
            onFileDrop={processFile}
            onClear={clear}
            format={overrideFormat}
            onFormatChange={setFormat}
            detectedFormat={result?.format ?? null}
            tokens={tokens}
            onSourceClick={handleSourceClick}
          />
        </div>

        {/* Right panel: Output */}
        <div className="w-1/2 flex flex-col min-w-0">
          <Breadcrumbs
            format={result?.format ?? null}
            formatLabel={result?.formatLabel ?? null}
            itemCount={result?.itemCount}
          />

          {result && (
            <>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onOpenSearchResults={() => setSearchResultsOpen(true)}
              />
              <div className="flex-1 min-h-0">
                <TreeView
                  data={result.data}
                  searchQuery={searchQuery}
                  focusedNodeId={focusedNodeId}
                  isMultiDocument={result.isMultiDocument}
                  onExpandValue={setExpandedValueNode}
                  onViewSubtree={setSubtreeNode}
                />
              </div>
            </>
          )}

          {error && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-lg w-full">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      {error.message}
                    </p>
                    {error.detail && error.detail !== error.message && (
                      <p className="text-xs text-red-600 dark:text-red-500 mt-1 font-mono break-all">
                        {error.detail}
                      </p>
                    )}
                    {error.position && (
                      <p className="text-xs text-red-500 dark:text-red-600 mt-1">
                        Line {error.position.line}, Column {error.position.column}
                      </p>
                    )}
                    {error.format && (
                      <p className="text-xs text-red-400 dark:text-red-600 mt-1">
                        Format attempted: {error.format.toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!result && !error && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Paste data on the left or drop a file to get started.
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                  Supports JSON, JWT, XML, YAML, MessagePack, CBOR, and Protobuf
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ValueViewer
        node={expandedValueNode}
        open={expandedValueNode !== null}
        onClose={() => setExpandedValueNode(null)}
      />

      <SubtreeViewer
        node={subtreeNode}
        open={subtreeNode !== null}
        onClose={() => setSubtreeNode(null)}
      />

      {result && (
        <SearchResults
          open={searchResultsOpen}
          onClose={() => setSearchResultsOpen(false)}
          data={result.data}
          isMultiDocument={result.isMultiDocument}
          onNavigate={handleNavigateToNode}
        />
      )}
    </div>
  )
}
