import type { NodeType } from '../components/TreeView/types.ts'

export interface TimestampInfo {
  /** The detected date as milliseconds since epoch */
  epochMs: number
  /** Whether the source was seconds, milliseconds, or a parsed string */
  source: 'epoch-seconds' | 'epoch-milliseconds' | 'date-string'
  /** If the string had an explicit timezone offset, its description */
  originalTimezone?: string
}

// 2000-01-01T00:00:00Z to 2100-01-01T00:00:00Z
const EPOCH_S_MIN = 946684800
const EPOCH_S_MAX = 4102444800
const EPOCH_MS_MIN = EPOCH_S_MIN * 1000
const EPOCH_MS_MAX = EPOCH_S_MAX * 1000

// ISO 8601 variants: 2024-01-15, 2024-01-15T10:30:00, 2024-01-15T10:30:00Z, 2024-01-15T10:30:00+05:30
// Also space-separated: 2024-01-15 10:30:00
const ISO_RE = /^\d{4}[-/]\d{2}[-/]\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/

// RFC 2822: Mon, 15 Jan 2024 10:30:00 GMT
const RFC2822_RE = /^[A-Z][a-z]{2},?\s+\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s/

// Extract timezone offset from end of string
const TZ_OFFSET_RE = /(Z|[+-]\d{2}:?\d{2})$/

function extractOriginalTimezone(str: string): string | undefined {
  const match = str.match(TZ_OFFSET_RE)
  if (!match) return undefined
  const offset = match[1]
  if (offset === 'Z') return 'UTC'
  return 'UTC' + offset
}

export function detectTimestamp(value: unknown, type: NodeType): TimestampInfo | null {
  if (type === 'number' || type === 'bigint') {
    const num = typeof value === 'bigint' ? Number(value) : value as number
    if (!Number.isFinite(num) || !Number.isSafeInteger(num) || num < 0) return null

    // Check milliseconds first (more selective range)
    if (num >= EPOCH_MS_MIN && num < EPOCH_MS_MAX) {
      return { epochMs: num, source: 'epoch-milliseconds' }
    }
    // Then seconds
    if (num >= EPOCH_S_MIN && num < EPOCH_S_MAX) {
      return { epochMs: num * 1000, source: 'epoch-seconds' }
    }
    return null
  }

  if (type === 'string' && typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length < 10 || trimmed.length > 40) return null

    if (!ISO_RE.test(trimmed) && !RFC2822_RE.test(trimmed)) return null

    const date = new Date(trimmed)
    if (isNaN(date.getTime())) return null

    return {
      epochMs: date.getTime(),
      source: 'date-string',
      originalTimezone: extractOriginalTimezone(trimmed),
    }
  }

  return null
}

// Cache for formatted timestamps
const formatCache = new Map<string, string>()
const MAX_CACHE_SIZE = 500

export function formatTimestamp(epochMs: number, timezone: string): string {
  const cacheKey = `${epochMs}|${timezone}`
  const cached = formatCache.get(cacheKey)
  if (cached) return cached

  const tz = timezone === 'local'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : timezone

  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(epochMs)

  // Evict oldest entries if cache grows too large
  if (formatCache.size >= MAX_CACHE_SIZE) {
    const firstKey = formatCache.keys().next().value
    if (firstKey !== undefined) formatCache.delete(firstKey)
  }
  formatCache.set(cacheKey, formatted)

  return formatted
}

export interface TimezoneOption {
  value: string
  label: string
}

export interface TimezoneGroup {
  label: string
  options: TimezoneOption[]
}

export const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    label: 'Americas',
    options: [
      { value: 'America/New_York', label: 'Eastern (ET)' },
      { value: 'America/Chicago', label: 'Central (CT)' },
      { value: 'America/Denver', label: 'Mountain (MT)' },
      { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
      { value: 'America/Anchorage', label: 'Alaska (AKT)' },
      { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
      { value: 'America/Sao_Paulo', label: 'Brasilia (BRT)' },
      { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (ART)' },
    ],
  },
  {
    label: 'Europe',
    options: [
      { value: 'Europe/London', label: 'London (GMT/BST)' },
      { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
      { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
      { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
    ],
  },
  {
    label: 'Asia & Pacific',
    options: [
      { value: 'Asia/Dubai', label: 'Dubai (GST)' },
      { value: 'Asia/Kolkata', label: 'India (IST)' },
      { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
      { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
      { value: 'Asia/Shanghai', label: 'China (CST)' },
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
      { value: 'Asia/Seoul', label: 'Seoul (KST)' },
      { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
      { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
    ],
  },
  {
    label: 'Africa & Middle East',
    options: [
      { value: 'Africa/Cairo', label: 'Cairo (EET)' },
      { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
      { value: 'Asia/Jerusalem', label: 'Jerusalem (IST)' },
    ],
  },
]
