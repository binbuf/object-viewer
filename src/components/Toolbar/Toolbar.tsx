import { Sun, Moon, RefreshCw } from 'lucide-react'

interface ToolbarProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onRefresh: () => void
}

export default function Toolbar({ theme, onToggleTheme, onRefresh }: ToolbarProps) {
  return (
    <header className="flex items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200 tracking-tight">
        Object Viewer
      </h1>
      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
        Decode &amp; explore data formats
      </span>
      <div className="ml-auto flex items-center gap-2">
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
