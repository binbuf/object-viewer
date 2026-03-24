import { Search, X, ExternalLink } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onOpenSearchResults?: () => void
}

export default function SearchBar({ value, onChange, onOpenSearchResults }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 dark:border-gray-700">
      <Search size={14} className="text-gray-400 flex-shrink-0" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search keys and values..."
        className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
      />
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
          title="Open advanced search"
        >
          <ExternalLink size={14} className="text-gray-400" />
        </button>
      )}
    </div>
  )
}
