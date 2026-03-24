import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import type { TreeNode } from './types.ts'
import { useTimezone } from '../../hooks/useTimezone.tsx'
import { detectTimestamp, formatTimestamp } from '../../utils/timestamp.ts'

interface TimestampLabelProps {
  node: TreeNode
}

export default function TimestampLabel({ node }: TimestampLabelProps) {
  const { timezone, timestampsEnabled } = useTimezone()

  const info = useMemo(() => detectTimestamp(node.value, node.type), [node.value, node.type])
  const formatted = useMemo(
    () => info ? formatTimestamp(info.epochMs, timezone) : null,
    [info, timezone],
  )

  if (!timestampsEnabled || !formatted) return null

  return (
    <span
      className="ml-2 text-xs text-amber-600 dark:text-amber-400 opacity-80 flex-shrink-0 whitespace-nowrap"
      title={`Detected ${info!.source.replace(/-/g, ' ')}${info!.originalTimezone ? ` (source: ${info!.originalTimezone})` : ''}`}
    >
      <Clock size={10} className="inline mr-0.5 -mt-0.5" />
      {formatted}
    </span>
  )
}
