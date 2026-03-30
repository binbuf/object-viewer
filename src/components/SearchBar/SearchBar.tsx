import { useCallback } from 'react'
import { Search, X, ExternalLink } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onOpenSearchResults?: () => void
  matchCount?: number
  currentMatchIndex?: number
  onCycleMatch?: (direction: 'next' | 'prev') => void
}

export default function SearchBar({ value, onChange, onOpenSearchResults, matchCount, currentMatchIndex, onCycleMatch }: SearchBarProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onCycleMatch) {
      e.preventDefault()
      onCycleMatch(e.shiftKey ? 'prev' : 'next')
    }
  }, [onCycleMatch])

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700">
      <Search size={14} className="text-gray-400 flex-shrink-0" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search keys and values..."
        className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
      />
      {value && matchCount !== undefined && matchCount > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 tabular-nums">
          {currentMatchIndex !== undefined && currentMatchIndex >= 0
            ? `${currentMatchIndex + 1} of ${matchCount}`
            : `${matchCount} match${matchCount !== 1 ? 'es' : ''}`}
        </span>
      )}
      {value && matchCount === 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
          No matches
        </span>
      )}
      {value && (
        <button
          onClick={() => onChange('')}
          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X size={14} className="text-gray-400" />
        </button>
      )}
      {onOpenSearchResults && (
        <button
          onClick={onOpenSearchResults}
          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Expand search"
        >
          <ExternalLink size={14} className="text-gray-400" />
        </button>
      )}
    </div>
  )
}
