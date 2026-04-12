import type { ReactNode } from 'react'
import type { DateRange, DateScope } from '~/lib/types'

import { createContext, useContext, useState } from 'react'

import {
  createCurrentMonthDateScope,
  createCustomDateScope,
  shiftDateScope,
} from '~/lib/date_scope'

interface DateScopeContextValue {
  scope: DateScope
  setCustomRange: (range: DateRange) => void
  shiftBackward: () => void
  shiftForward: () => void
  resetToCurrentMonth: () => void
}

const DateScopeContext = createContext<DateScopeContextValue | null>(null)

export function DateScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<DateScope>(() => createCurrentMonthDateScope())

  return (
    <DateScopeContext.Provider
      value={{
        resetToCurrentMonth: () => setScope(createCurrentMonthDateScope()),
        scope,
        setCustomRange: (range) => setScope(createCustomDateScope(range)),
        shiftBackward: () => setScope((current) => shiftDateScope(current, -1)),
        shiftForward: () => setScope((current) => shiftDateScope(current, 1)),
      }}
    >
      {children}
    </DateScopeContext.Provider>
  )
}

export function useDateScope() {
  const value = useContext(DateScopeContext)
  if (!value) {
    throw new Error('useDateScope must be used within DateScopeProvider')
  }

  return value
}
