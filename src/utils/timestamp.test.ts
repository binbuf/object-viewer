import { describe, it, expect } from 'vitest'
import { detectTimestamp, formatTimestamp, TIMEZONE_GROUPS } from './timestamp.ts'

describe('detectTimestamp', () => {
  describe('epoch seconds', () => {
    it('detects a valid epoch seconds value', () => {
      const result = detectTimestamp(1705312200, 'number')
      expect(result).toEqual({
        epochMs: 1705312200000,
        source: 'epoch-seconds',
      })
    })

    it('detects the minimum epoch seconds (2000-01-01)', () => {
      const result = detectTimestamp(946684800, 'number')
      expect(result).not.toBeNull()
      expect(result!.source).toBe('epoch-seconds')
    })

    it('rejects small numbers as non-timestamps', () => {
      expect(detectTimestamp(42, 'number')).toBeNull()
      expect(detectTimestamp(8080, 'number')).toBeNull()
      expect(detectTimestamp(2024, 'number')).toBeNull()
    })

    it('rejects negative numbers', () => {
      expect(detectTimestamp(-1705312200, 'number')).toBeNull()
    })

    it('rejects floats with significant fractional parts', () => {
      // Number.isSafeInteger check should catch non-integers
      expect(detectTimestamp(1705312200.5, 'number')).toBeNull()
    })
  })

  describe('epoch milliseconds', () => {
    it('detects a valid epoch milliseconds value', () => {
      const result = detectTimestamp(1705312200000, 'number')
      expect(result).toEqual({
        epochMs: 1705312200000,
        source: 'epoch-milliseconds',
      })
    })

    it('detects Date.now() range values as milliseconds', () => {
      const now = Date.now()
      const result = detectTimestamp(now, 'number')
      expect(result).not.toBeNull()
      expect(result!.source).toBe('epoch-milliseconds')
      expect(result!.epochMs).toBe(now)
    })
  })

  describe('bigint', () => {
    it('detects bigint epoch seconds', () => {
      const result = detectTimestamp(BigInt(1705312200), 'bigint')
      expect(result).not.toBeNull()
      expect(result!.source).toBe('epoch-seconds')
    })
  })

  describe('string timestamps', () => {
    it('detects ISO 8601 with Z timezone', () => {
      const result = detectTimestamp('2024-01-15T10:30:00Z', 'string')
      expect(result).not.toBeNull()
      expect(result!.source).toBe('date-string')
      expect(result!.originalTimezone).toBe('UTC')
    })

    it('detects ISO 8601 with offset', () => {
      const result = detectTimestamp('2024-01-15T10:30:00+05:30', 'string')
      expect(result).not.toBeNull()
      expect(result!.source).toBe('date-string')
      expect(result!.originalTimezone).toBe('UTC+05:30')
    })

    it('detects ISO 8601 date only', () => {
      const result = detectTimestamp('2024-01-15', 'string')
      expect(result).not.toBeNull()
      expect(result!.source).toBe('date-string')
      expect(result!.originalTimezone).toBeUndefined()
    })

    it('detects space-separated datetime', () => {
      const result = detectTimestamp('2024-01-15 10:30:00', 'string')
      expect(result).not.toBeNull()
      expect(result!.source).toBe('date-string')
    })

    it('detects ISO with milliseconds', () => {
      const result = detectTimestamp('2024-01-15T10:30:00.123Z', 'string')
      expect(result).not.toBeNull()
      expect(result!.originalTimezone).toBe('UTC')
    })

    it('rejects non-date strings', () => {
      expect(detectTimestamp('hello world', 'string')).toBeNull()
      expect(detectTimestamp('123', 'string')).toBeNull()
      expect(detectTimestamp('true', 'string')).toBeNull()
      expect(detectTimestamp('', 'string')).toBeNull()
    })

    it('rejects strings that are too long', () => {
      expect(detectTimestamp('2024-01-15T10:30:00Z and some extra text here!!', 'string')).toBeNull()
    })

    it('rejects strings that are too short', () => {
      expect(detectTimestamp('2024-01', 'string')).toBeNull()
    })
  })

  describe('non-timestamp types', () => {
    it('returns null for booleans', () => {
      expect(detectTimestamp(true, 'boolean')).toBeNull()
    })

    it('returns null for null', () => {
      expect(detectTimestamp(null, 'null')).toBeNull()
    })

    it('returns null for objects', () => {
      expect(detectTimestamp({}, 'object')).toBeNull()
    })

    it('returns null for arrays', () => {
      expect(detectTimestamp([], 'array')).toBeNull()
    })
  })
})

describe('formatTimestamp', () => {
  it('formats a timestamp in UTC', () => {
    // 2024-01-15T12:00:00.000Z = 1705320000000
    const result = formatTimestamp(1705320000000, 'UTC')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
    expect(result).toContain('2024')
    expect(result).toContain('12:00:00')
  })

  it('formats a timestamp in a specific timezone', () => {
    // 2024-01-15T12:00:00Z in Eastern should be 7:00 AM EST
    const result = formatTimestamp(1705320000000, 'America/New_York')
    expect(result).toContain('Jan')
    expect(result).toContain('15')
    expect(result).toContain('2024')
    expect(result).toContain('7:00:00')
  })

  it('returns cached result for same inputs', () => {
    const result1 = formatTimestamp(1705312200000, 'UTC')
    const result2 = formatTimestamp(1705312200000, 'UTC')
    expect(result1).toBe(result2)
  })
})

describe('TIMEZONE_GROUPS', () => {
  it('contains major timezone regions', () => {
    const labels = TIMEZONE_GROUPS.map(g => g.label)
    expect(labels).toContain('Americas')
    expect(labels).toContain('Europe')
    expect(labels).toContain('Asia & Pacific')
  })

  it('has options in each group', () => {
    for (const group of TIMEZONE_GROUPS) {
      expect(group.options.length).toBeGreaterThan(0)
      for (const opt of group.options) {
        expect(opt.value).toBeTruthy()
        expect(opt.label).toBeTruthy()
      }
    }
  })
})
