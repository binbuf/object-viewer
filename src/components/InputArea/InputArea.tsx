import { useCallback, useRef, useState } from 'react'
import { Upload, X, Clipboard } from 'lucide-react'

interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onFileDrop: (file: File) => void
  onClear: () => void
}

export default function InputArea({ value, onChange, onFileDrop, onClear }: InputAreaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dragCounter = useRef(0)

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
    if (file) {
      onFileDrop(file)
    }
  }, [onFileDrop])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      onChange(text)
    } catch {
      // Clipboard API not available, user can paste normally
    }
  }, [onChange])

  const byteCount = new TextEncoder().encode(value).length

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
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
          {value.length > 0 && `${value.length.toLocaleString()} chars / ${byteCount.toLocaleString()} bytes`}
        </span>
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

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Paste JSON, JWT, XML, YAML, or drop a file (MessagePack, CBOR, Protobuf)..."
        className="flex-1 w-full p-3 bg-transparent text-sm font-mono text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none"
        spellCheck={false}
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
