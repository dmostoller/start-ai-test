/** Shared board vocabulary used by the UI, the AI tools and the Convex layer. */

export const DAY = 24 * 60 * 60 * 1000

export type CardType = 'income' | 'expense'
export type CardStatus = 'upcoming' | 'due' | 'paid' | 'expected' | 'received'
export type CardPriority = 'low' | 'medium' | 'high'
export type RecurrenceFrequency = 'weekly' | 'monthly'

export interface Recurrence {
  frequency: RecurrenceFrequency
  /** Repeat every N weeks/months. */
  interval: number
  /** Weekly only, 0 (Sunday) - 6 (Saturday). */
  weekday?: number
  /** Monthly only, 1-31 (clamped to the last day of shorter months). */
  dayOfMonth?: number
}

export interface Card {
  _id: string
  _creationTime: number
  userId: string
  type: CardType
  amount: number
  description: string
  date: number
  category: string
  priority: CardPriority
  recurring: boolean
  recurrence?: Recurrence
  source?: string
  status: CardStatus
  order: number
  createdAt: number
  completedAt?: number
}

export interface Lane {
  type: CardType
  title: string
  columns: Array<{ status: CardStatus; title: string }>
}

export const LANES: Array<Lane> = [
  {
    type: 'expense',
    title: 'Expenses',
    columns: [
      { status: 'upcoming', title: 'Upcoming' },
      { status: 'due', title: 'Due' },
      { status: 'paid', title: 'Paid' },
    ],
  },
  {
    type: 'income',
    title: 'Income',
    columns: [
      { status: 'expected', title: 'Expected' },
      { status: 'received', title: 'Received' },
    ],
  },
]

export const COMPLETED_STATUSES: Array<CardStatus> = ['paid', 'received']

export function isCompleted(status: CardStatus) {
  return COMPLETED_STATUSES.includes(status)
}

export function statusLabel(status: CardStatus) {
  for (const lane of LANES) {
    const column = lane.columns.find((c) => c.status === status)
    if (column) return column.title
  }
  return status
}

export function typeForStatus(status: CardStatus): CardType {
  return status === 'expected' || status === 'received' ? 'income' : 'expense'
}

export const HORIZON_OPTIONS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
  { days: 60, label: '2 months' },
  { days: 90, label: '3 months' },
  { days: 365, label: '1 year' },
]

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: new Date(ms).getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

/** Local-date `YYYY-MM-DD` string, for `<input type="date">`. */
export function toDateInput(ms: number) {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Parse a `YYYY-MM-DD` string as local noon, avoiding timezone drift. */
export function fromDateInput(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getTime()
}

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/** Human-readable summary of a recurrence rule, e.g. "Every 2 weeks on Wednesday". */
export function describeRecurrence(recurrence: Recurrence): string {
  if (recurrence.frequency === 'weekly') {
    const weekday = WEEKDAYS[recurrence.weekday ?? 0]
    return recurrence.interval === 1
      ? `Weekly on ${weekday}`
      : `Every ${recurrence.interval} weeks on ${weekday}`
  }
  const day = ordinal(recurrence.dayOfMonth ?? 1)
  return recurrence.interval === 1
    ? `Monthly on the ${day}`
    : `Every ${recurrence.interval} months on the ${day}`
}

/** The next date a recurrence rule lands on, strictly after `fromDate`. */
export function nextOccurrence(fromDate: number, recurrence: Recurrence): number {
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

export type DateUrgency = 'overdue' | 'due-soon' | 'later' | 'done'

export function urgency(card: Card, now = Date.now()): DateUrgency {
  if (isCompleted(card.status)) return 'done'
  if (card.date < now) return 'overdue'
  if (card.date <= now + 7 * DAY) return 'due-soon'
  return 'later'
}

export function relativeDue(ms: number, now = Date.now()) {
  const days = Math.round((ms - now) / DAY)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  if (days < 0) return `${Math.abs(days)} days ago`
  if (days < 30) return `in ${days} days`
  return formatDate(ms)
}
