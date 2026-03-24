import { useState } from 'react'
import Toolbar from './components/Toolbar/Toolbar.tsx'
import InputArea from './components/InputArea/InputArea.tsx'
import TreeView from './components/TreeView/TreeView.tsx'
import SearchBar from './components/SearchBar/SearchBar.tsx'
import Breadcrumbs from './components/Breadcrumbs/Breadcrumbs.tsx'
import { useTheme } from './hooks/useTheme.ts'
import { useDecoder } from './hooks/useDecoder.ts'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const { input, result, error, setInput, processFile, clear } = useDecoder()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Toolbar theme={theme} onToggleTheme={toggleTheme} />

      <div className="flex-1 flex min-h-0">
        {/* Left panel: Input */}
        <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700 min-w-0">
          <InputArea
            value={input}
            onChange={setInput}
            onFileDrop={processFile}
            onClear={clear}
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
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
              <div className="flex-1 min-h-0">
                <TreeView data={result.data} searchQuery={searchQuery} />
              </div>
            </>
          )}

          {error && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
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
    </div>
  )
}
