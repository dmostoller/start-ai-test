import { DAY, formatCurrency, isCompleted, relativeDue } from './board'
import type { Card } from './board'

export type AlertKind = 'overdue' | 'due-today' | 'due-soon' | 'income-late'

export interface Alert {
  /** Stable across renders and reloads so a dismissal sticks. */
  id: string
  kind: AlertKind
  cardId: string
  title: string
  detail: string
  date: number
}

const KIND_WEIGHT: Record<AlertKind, number> = {
  overdue: 0,
  'due-today': 1,
  'due-soon': 2,
  'income-late': 3,
}

function sameDay(a: number, b: number) {
  const left = new Date(a)
  const right = new Date(b)
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

/**
 * Alerts are derived from the cards themselves rather than stored, so they can
 * never drift out of sync with the board. The id folds in the card's date and
 * status, which means dismissing an alert hides *that* state — if the bill
 * slips another week, it speaks up again.
 */
export function buildAlerts(cards: Array<Card>, now = Date.now()): Array<Alert> {
  const alerts: Array<Alert> = []

  for (const card of cards) {
    if (isCompleted(card.status)) continue

    const money = formatCurrency(card.amount)
    const base = { cardId: card._id, date: card.date }
    const id = `${card._id}:${card.status}:${card.date}`

    if (card.type === 'expense') {
      if (card.date < now && !sameDay(card.date, now)) {
        alerts.push({
          ...base,
          id,
          kind: 'overdue',
          title: `${card.description} is overdue`,
          detail: `${money} · due ${relativeDue(card.date, now)}`,
        })
      } else if (sameDay(card.date, now)) {
        alerts.push({
          ...base,
          id,
          kind: 'due-today',
          title: `${card.description} is due today`,
          detail: money,
        })
      } else if (card.date <= now + 7 * DAY) {
        alerts.push({
          ...base,
          id,
          kind: 'due-soon',
          title: `${card.description} is due ${relativeDue(card.date, now)}`,
          detail: money,
        })
      }
    } else if (card.date < now && !sameDay(card.date, now)) {
      alerts.push({
        ...base,
        id,
        kind: 'income-late',
        title: `${card.description} hasn’t arrived`,
        detail: `${money} · expected ${relativeDue(card.date, now)}`,
      })
    }
  }

  return alerts.sort((a, b) => KIND_WEIGHT[a.kind] - KIND_WEIGHT[b.kind] || a.date - b.date)
}

const STORAGE_KEY = 'budget-board:dismissed-alerts'

export function readDismissed(): Array<string> {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Array<string>) : []
  } catch {
    return []
  }
}

export function writeDismissed(ids: Array<string>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Storage can be unavailable (private mode); alerts simply come back.
  }
}

/** Drops dismissals whose alert no longer exists, so the list cannot grow forever. */
export function pruneDismissed(dismissed: Array<string>, alerts: Array<Alert>) {
  const live = new Set(alerts.map((a) => a.id))
  return dismissed.filter((id) => live.has(id))
}
