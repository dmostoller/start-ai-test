import type { Doc } from './_generated/dataModel'

export const EXPENSE_STATUSES = ['upcoming', 'due', 'paid'] as const
export const INCOME_STATUSES = ['expected', 'received'] as const

export const COMPLETED_STATUSES = ['paid', 'received'] as const

export type CardDoc = Doc<'cards'>
export type CardRecurrence = NonNullable<CardDoc['recurrence']>

export function isCompletedStatus(status: string) {
  return (COMPLETED_STATUSES as readonly string[]).includes(status)
}

export function statusesForType(type: 'income' | 'expense') {
  return type === 'expense' ? EXPENSE_STATUSES : INCOME_STATUSES
}

/** Default status a newly created card lands in. */
export function defaultStatus(type: 'income' | 'expense') {
  return type === 'expense' ? 'upcoming' : 'expected'
}

/** The next date a recurrence rule lands on, strictly after `fromDate`. */
export function nextOccurrence(fromDate: number, recurrence: CardRecurrence): number {
  const from = new Date(fromDate)

  if (recurrence.frequency === 'weekly') {
    const targetWeekday = recurrence.weekday ?? from.getDay()
    const next = new Date(from)
    next.setDate(next.getDate() + 1)
    while (next.getDay() !== targetWeekday) next.setDate(next.getDate() + 1)
    next.setDate(next.getDate() + (recurrence.interval - 1) * 7)
    next.setHours(12, 0, 0, 0)
    return next.getTime()
  }

  const day = recurrence.dayOfMonth ?? from.getDate()
  const next = new Date(from.getFullYear(), from.getMonth() + recurrence.interval, 1, 12)
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, daysInMonth))
  return next.getTime()
}

/**
 * Every date within [now, horizonEnd] a card lands on for forecasting
 * purposes — just its own date for a one-off card, or every future
 * occurrence for a recurring one. The card's own date is always included
 * (even if overdue), but occurrences skipped between then and now are not
 * back-filled as a missed backlog.
 */
export function occurrencesInRange(
  date: number,
  recurrence: CardRecurrence | undefined,
  now: number,
  horizonEnd: number,
): Array<number> {
  if (date > horizonEnd) return []
  if (!recurrence) return [date]

  const dates = [date]
  let cursor = date
  for (let i = 0; i < 1000; i++) {
    cursor = nextOccurrence(cursor, recurrence)
    if (cursor > horizonEnd) break
    if (cursor >= now) dates.push(cursor)
  }
  return dates
}
