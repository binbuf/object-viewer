import { useState } from 'react'
import { Sun, Moon, RefreshCw, PanelLeft, PanelRight, ShieldCheck } from 'lucide-react'

interface ToolbarProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onRefresh: () => void
  showSource: boolean
  showDisplay: boolean
  onToggleSource: () => void
  onToggleDisplay: () => void
}

export default function Toolbar({ theme, onToggleTheme, onRefresh, showSource, showDisplay, onToggleSource, onToggleDisplay }: ToolbarProps) {
  const [privacyOpen, setPrivacyOpen] = useState(false)

  return (
    <header className="flex items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900">
      <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200 tracking-tight">
        Object Viewer
      </h1>
      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
        Decode &amp; explore data formats
      </span>
      <div className="relative ml-3" onMouseLeave={() => setPrivacyOpen(false)}>
        <button
          onClick={() => setPrivacyOpen(o => !o)}
          onMouseEnter={() => setPrivacyOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30"
        >
          <ShieldCheck size={14} />
          <span>Privacy</span>
        </button>
        {privacyOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 px-3 py-2 rounded-lg bg-gray-800 dark:bg-gray-700 text-white text-xs leading-relaxed shadow-lg z-50">
            Everything you enter into this app stays on your device. No data is sent to any server.
          </div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onToggleSource}
          className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${showSource ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}
          title={showSource ? 'Hide source panel' : 'Show source panel'}
        >
          <PanelLeft size={16} />
        </button>
        <button
          onClick={onToggleDisplay}
          className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 ${showDisplay ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}
          title={showDisplay ? 'Hide display panel' : 'Show display panel'}
        >
          <PanelRight size={16} />
        </button>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          title="Re-decode input"
        >
          <RefreshCw size={16} />
        </button>
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  )
}
