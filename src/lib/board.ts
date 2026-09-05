/** Shared board vocabulary used by the UI, the AI tools and the Convex layer. */

export const DAY = 24 * 60 * 60 * 1000

export type CardType = 'income' | 'expense'
export type CardStatus = 'upcoming' | 'due' | 'paid' | 'expected' | 'received'
export type CardPriority = 'low' | 'medium' | 'high'

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
    year:
      new Date(ms).getFullYear() === new Date().getFullYear()
        ? undefined
        : 'numeric',
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
