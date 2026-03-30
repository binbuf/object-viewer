import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Upload, X, Clipboard, Wand2, FolderOpen, Download } from 'lucide-react'
import type { FormatId } from '../../decoders/types.ts'
import { getAvailableFormats } from '../../decoders/index.ts'
import { formatInput } from '../../utils/formatInput.ts'
import type { SourceToken } from '../../utils/tokenizers/types.ts'
import HighlightedSource from './HighlightedSource.tsx'

interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onFileDrop: (file: File) => void
  onClear: () => void
  format: FormatId | null
  onFormatChange: (format: FormatId | null) => void
  detectedFormat: FormatId | null
  tokens?: SourceToken[] | null
  onSourceClick?: (offset: number) => void
  sourceScrollTarget?: { offset: number; length: number } | null
}

const formats = getAvailableFormats()

export default function InputArea({ value, onChange, onFileDrop, onClear, format, onFormatChange, detectedFormat, tokens, onSourceClick, sourceScrollTarget }: InputAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLPreElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const pendingCursorRef = useRef<{ start: number; end: number } | null>(null)
  const hasHighlight = tokens != null && tokens.length > 0

  useLayoutEffect(() => {
    if (pendingCursorRef.current && textareaRef.current) {
      textareaRef.current.selectionStart = pendingCursorRef.current.start
      textareaRef.current.selectionEnd = pendingCursorRef.current.end
      pendingCursorRef.current = null
    }
  })

  // Scroll to source location when a tree node is clicked
  useEffect(() => {
    if (!sourceScrollTarget || !textareaRef.current) return
    const { offset, length } = sourceScrollTarget
    const ta = textareaRef.current

    // Set selection to highlight the span
    ta.focus()
    ta.selectionStart = offset
    ta.selectionEnd = offset + length

    // Calculate line number from offset to scroll there
    const textBefore = value.substring(0, offset)
    const lineNum = textBefore.split('\n').length - 1
    const lineHeight = 20 // approximate line height in px
    ta.scrollTop = Math.max(0, lineNum * lineHeight - ta.clientHeight / 3)

    // Sync the highlight overlay scroll
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop
      highlightRef.current.scrollLeft = ta.scrollLeft
    }
  }, [sourceScrollTarget, value])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileDrop(file)
  }, [onFileDrop])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      onChange(text)
    } catch {
      // Clipboard API not available
    }
  }, [onChange])

  const handleFormat = useCallback(() => {
    const fmt = format || detectedFormat
    if (!fmt || !value.trim()) return
    const formatted = formatInput(value, fmt)
    if (formatted !== value) onChange(formatted)
  }, [value, format, detectedFormat, onChange])

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileDrop(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [onFileDrop])

  const handleSaveToFile = useCallback(() => {
    if (!value) return
    const ext: Record<string, string> = {
      json: 'json', json5: 'json5', jwt: 'txt', xml: 'xml',
      yaml: 'yaml', msgpack: 'msgpack', cbor: 'cbor', protobuf: 'bin',
    }
    const filename = `data.${ext[detectedFormat ?? ''] ?? 'txt'}`
    const blob = new Blob([value], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [value, detectedFormat])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return

    e.preventDefault()
    const { selectionStart, selectionEnd } = e.currentTarget
    const indent = '  '

    if (!e.shiftKey) {
      if (selectionStart === selectionEnd) {
        const before = value.slice(0, selectionStart)
        const after = value.slice(selectionEnd)
        onChange(before + indent + after)
        pendingCursorRef.current = {
          start: selectionStart + indent.length,
          end: selectionStart + indent.length,
        }
      } else {
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
        const block = value.slice(lineStart, selectionEnd)
        const indented = block.replace(/^/gm, indent)
        const lineCount = block.split('\n').length
        onChange(value.slice(0, lineStart) + indented + value.slice(selectionEnd))
        pendingCursorRef.current = {
          start: selectionStart + indent.length,
          end: selectionEnd + lineCount * indent.length,
        }
      }
    } else {
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
      const block = value.slice(lineStart, selectionEnd)
      let removedBeforeCursor = 0
      let totalRemoved = 0
      let firstLine = true
      const dedented = block.replace(/^ {1,2}/gm, (match) => {
        if (firstLine) {
          removedBeforeCursor = Math.min(match.length, selectionStart - lineStart)
          firstLine = false
        }
        totalRemoved += match.length
        return ''
      })
      onChange(value.slice(0, lineStart) + dedented + value.slice(selectionEnd))
      pendingCursorRef.current = {
        start: Math.max(lineStart, selectionStart - removedBeforeCursor),
        end: selectionEnd - totalRemoved,
      }
    }
  }, [value, onChange])

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  const handleClick = useCallback(() => {
    if (!onSourceClick || !textareaRef.current) return
    const { selectionStart, selectionEnd } = textareaRef.current
    if (selectionStart === selectionEnd) {
      onSourceClick(selectionStart)
    }
  }, [onSourceClick])

  const byteCount = new TextEncoder().encode(value).length
  const canFormat = Boolean(value.trim() && (format || detectedFormat))

  return (
    <div
      className="relative flex flex-col h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Input</span>

        {/* Format selector */}
        <select
          value={format || ''}
          onChange={e => onFormatChange(e.target.value ? e.target.value as FormatId : null)}
          className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
        >
          <option value="">Auto-detect</option>
          {formats.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>

        {/* Format/prettify button */}
        <button
          onClick={handleFormat}
          disabled={!canFormat}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Format / pretty-print"
        >
          <Wand2 size={14} />
        </button>
        <button
          onClick={handleOpenFile}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          title="Open file"
        >
          <FolderOpen size={14} />
        </button>

        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
          {value.length > 0 && `${value.length.toLocaleString()} chars / ${byteCount.toLocaleString()} bytes`}
        </span>
        <button
          onClick={handleSaveToFile}
          disabled={!value}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Save to file"
        >
          <Download size={14} />
        </button>
        <button
          onClick={handlePaste}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          title="Paste from clipboard"
        >
          <Clipboard size={14} />
        </button>
        {value && (
          <button
            onClick={onClear}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            title="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Editor area with optional syntax highlighting overlay */}
      <div className="flex-1 relative min-h-0">
        {hasHighlight && (
          <HighlightedSource ref={highlightRef} tokens={tokens} />
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onClick={handleClick}
          placeholder="Paste JSON, JWT, XML, YAML, or drop a file (MessagePack, CBOR, Protobuf)..."
          className={`absolute inset-0 w-full h-full p-3 bg-transparent text-sm font-mono resize-none focus:outline-none ${
            hasHighlight
              ? 'text-transparent caret-gray-800 dark:caret-gray-200 selection:bg-blue-200/50 dark:selection:bg-blue-700/50'
              : 'text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500'
          }`}
          spellCheck={false}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2 text-blue-600 dark:text-blue-400">
            <Upload size={32} />
            <span className="text-sm font-medium">Drop file to decode</span>
          </div>
        </div>
      )}
    </div>
  )
}
