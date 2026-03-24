import { ChevronRight, ArrowRight } from 'lucide-react'
import type { FormatId } from '../../decoders/types.ts'
import type { ConvertTargetId } from '../../utils/convertData.ts'

interface BreadcrumbsProps {
  format: FormatId | null
  formatLabel: string | null
  itemCount?: number
  path?: string[]
  conversionTargets?: ConvertTargetId[]
  onConvert?: (target: ConvertTargetId) => void
}

const FORMAT_COLORS: Record<string, string> = {
  json: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  json5: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  jwt: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  xml: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  yaml: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  msgpack: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  cbor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  protobuf: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

const TARGET_LABELS: Record<ConvertTargetId, string> = {
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
}

export default function Breadcrumbs({ format, formatLabel, itemCount, path, conversionTargets, onConvert }: BreadcrumbsProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      {format && (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${FORMAT_COLORS[format] || 'bg-gray-100 text-gray-600'}`}>
          {formatLabel || format.toUpperCase()}
          {itemCount && itemCount > 1 ? ` (${itemCount} objects)` : ''}
        </span>
      )}
      {conversionTargets && conversionTargets.length > 0 && onConvert && (
        <>
          <ArrowRight size={12} className="text-gray-400 flex-shrink-0 mx-0.5" />
          {conversionTargets.map(target => (
            <button
              key={target}
              onClick={() => onConvert(target)}
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
            >
              {TARGET_LABELS[target]}
            </button>
          ))}
        </>
      )}
      {path && path.length > 0 && (
        <>
          <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
          <span className="font-mono">$</span>
          {path.map((segment, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={12} className="text-gray-400 flex-shrink-0" />
              <span className="font-mono">{segment}</span>
            </span>
          ))}
        </>
      )}
    </div>
  )
}
