import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
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
import { getConversionTargets, convertData } from './utils/convertData.ts'
import { tokenizeSource } from './utils/tokenizers/index.ts'
import { buildSourceMap, findNodeAtOffset, findSpanForNode } from './utils/sourceMap/index.ts'
import type { TreeNode } from './components/TreeView/types.ts'
import { AlertTriangle } from 'lucide-react'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const { input, result, error, overrideFormat, setInput, setInputFresh, setFormat, processFile, refresh, clear } = useDecoder()
  const [searchQuery, setSearchQueryRaw] = useState('')
  const [orderedMatchIds, setOrderedMatchIds] = useState<string[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1)
  const setSearchQuery = useCallback((q: string) => {
    setSearchQueryRaw(q)
    setCurrentMatchIndex(-1)
  }, [])

  // Modal states
  const [expandedValueNode, setExpandedValueNode] = useState<TreeNode | null>(null)
  const [subtreeNode, setSubtreeNode] = useState<TreeNode | null>(null)
  const [searchResultsOpen, setSearchResultsOpen] = useState(false)
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null)
  const [sourceScrollTarget, setSourceScrollTarget] = useState<{ offset: number; length: number; seq: number } | null>(null)
  const scrollSeqRef = useRef(0)

  // Panel visibility and resize
  const [showSource, setShowSource] = useState(true)
  const [showDisplay, setShowDisplay] = useState(true)
  const [splitPercent, setSplitPercent] = useState(50)
  const isDraggingRef = useRef(false)
  const splitContainerRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !splitContainerRef.current) return
      const rect = splitContainerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setSplitPercent(Math.min(85, Math.max(15, pct)))
    }

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const toggleSource = useCallback(() => {
    if (showSource && !showDisplay) return // can't hide both
    setShowSource(s => !s)
  }, [showSource, showDisplay])

  const toggleDisplay = useCallback(() => {
    if (showDisplay && !showSource) return // can't hide both
    setShowDisplay(s => !s)
  }, [showSource, showDisplay])

  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleNavigateToNode = useCallback((nodeId: string) => {
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current)
    setFocusedNodeId(nodeId)
    focusTimeoutRef.current = setTimeout(() => setFocusedNodeId(null), 3000)
  }, [])

  const handleCycleMatch = useCallback((direction: 'next' | 'prev') => {
    if (orderedMatchIds.length === 0) return
    setCurrentMatchIndex(prev => {
      let next: number
      if (prev === -1) {
        next = direction === 'next' ? 0 : orderedMatchIds.length - 1
      } else if (direction === 'next') {
        next = (prev + 1) % orderedMatchIds.length
      } else {
        next = (prev - 1 + orderedMatchIds.length) % orderedMatchIds.length
      }
      handleNavigateToNode(orderedMatchIds[next])
      return next
    })
  }, [orderedMatchIds, handleNavigateToNode])

  const handleSearchMatchesChange = useCallback((matchIds: string[]) => {
    setOrderedMatchIds(matchIds)
    setCurrentMatchIndex(-1)
  }, [])

  const conversionTargets = useMemo(() => {
    if (!result) return []
    return getConversionTargets(result.format)
  }, [result])

  const handleConvert = useCallback((target: Parameters<typeof convertData>[1]) => {
    if (!result) return
    const converted = convertData(result.data, target, result.isMultiDocument)
    setInputFresh(converted)
  }, [result, setInputFresh])

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

  const handleTreeNodeClick = useCallback((nodeId: string) => {
    if (!sourceMap) return
    const span = findSpanForNode(sourceMap, nodeId)
    if (span) {
      scrollSeqRef.current++
      setSourceScrollTarget({ offset: span.startOffset, length: span.endOffset - span.startOffset, seq: scrollSeqRef.current })
    }
  }, [sourceMap])

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Toolbar
        theme={theme}
        onToggleTheme={toggleTheme}
        onRefresh={refresh}
        showSource={showSource}
        showDisplay={showDisplay}
        onToggleSource={toggleSource}
        onToggleDisplay={toggleDisplay}
      />

      <div ref={splitContainerRef} className="flex-1 flex min-h-0">
        {/* Left panel: Input */}
        {showSource && (
          <div
            className="flex flex-col border-r border-gray-200 dark:border-gray-700 min-w-0"
            style={{ width: showDisplay ? `${splitPercent}%` : '100%' }}
          >
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
              sourceScrollTarget={sourceScrollTarget}
            />
          </div>
        )}

        {/* Resize handle */}
        {showSource && showDisplay && (
          <div
            className="w-1 flex-shrink-0 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors"
            onMouseDown={handleDragStart}
          />
        )}

        {/* Right panel: Output */}
        {showDisplay && (
        <div
          className="flex flex-col min-w-0"
          style={{ width: showSource ? `${100 - splitPercent}%` : '100%' }}
        >
          <Breadcrumbs
            format={result?.format ?? null}
            formatLabel={result?.formatLabel ?? null}
            itemCount={result?.itemCount}
            conversionTargets={conversionTargets}
            onConvert={handleConvert}
          />

          {result && (
            <>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onOpenSearchResults={() => setSearchResultsOpen(true)}
                matchCount={orderedMatchIds.length}
                currentMatchIndex={currentMatchIndex}
                onCycleMatch={handleCycleMatch}
              />
              <div className="flex-1 min-h-0">
                <TreeView
                  data={result.data}
                  searchQuery={searchQuery}
                  focusedNodeId={focusedNodeId}
                  isMultiDocument={result.isMultiDocument}
                  onExpandValue={setExpandedValueNode}
                  onViewSubtree={setSubtreeNode}
                  onNodeClick={handleTreeNodeClick}
                  onSearchMatchesChange={handleSearchMatchesChange}
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
        )}
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
          initialQuery={searchQuery}
        />
      )}
    </div>
  )
}
