import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'

const TZ_STORAGE_KEY = 'object-viewer-timezone'
const ENABLED_STORAGE_KEY = 'object-viewer-timestamps-enabled'

interface TimezoneContextValue {
  timezone: string
  setTimezone: (tz: string) => void
  timestampsEnabled: boolean
  setTimestampsEnabled: (v: boolean) => void
}

const TimezoneContext = createContext<TimezoneContextValue>({
  timezone: 'local',
  setTimezone: () => {},
  timestampsEnabled: true,
  setTimestampsEnabled: () => {},
})

function getInitialTimezone(): string {
  try {
    const stored = localStorage.getItem(TZ_STORAGE_KEY)
    if (stored) return stored
  } catch {
    // localStorage not available
  }
  return 'local'
}

function getInitialEnabled(): boolean {
  try {
    const stored = localStorage.getItem(ENABLED_STORAGE_KEY)
    if (stored === 'false') return false
  } catch {
    // localStorage not available
  }
  return true
}

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState(getInitialTimezone)
  const [timestampsEnabled, setTimestampsEnabledState] = useState(getInitialEnabled)

  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz)
    try {
      localStorage.setItem(TZ_STORAGE_KEY, tz)
    } catch {
      // localStorage not available
    }
  }, [])

  const setTimestampsEnabled = useCallback((v: boolean) => {
    setTimestampsEnabledState(v)
    try {
      localStorage.setItem(ENABLED_STORAGE_KEY, String(v))
    } catch {
      // localStorage not available
    }
  }, [])

  const value = useMemo(
    () => ({ timezone, setTimezone, timestampsEnabled, setTimestampsEnabled }),
    [timezone, setTimezone, timestampsEnabled, setTimestampsEnabled],
  )

  return <TimezoneContext value={value}>{children}</TimezoneContext>
}

export function useTimezone(): TimezoneContextValue {
  return useContext(TimezoneContext)
}
