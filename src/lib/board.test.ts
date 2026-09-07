import { describe, expect, test } from 'vite-plus/test'
import {
  DAY,
  describeRecurrence,
  fromDateInput,
  nextOccurrence,
  occurrencesInRange,
  relativeDue,
  statusLabel,
  toDateInput,
  typeForStatus,
  urgency,
} from './board'
import type { Card, Recurrence } from './board'

function card(overrides: Partial<Card> = {}): Card {
  return {
    _id: 'card_1',
    _creationTime: 0,
    userId: 'user_1',
    type: 'expense',
    amount: 100,
    description: 'Rent',
    date: Date.now() + 10 * DAY,
    category: 'Rent/Mortgage',
    priority: 'medium',
    recurring: false,
    status: 'upcoming',
    order: 1000,
    createdAt: 0,
    ...overrides,
  }
}

describe('date helpers', () => {
  test('round-trips a date input through local noon', () => {
    const ms = fromDateInput('2026-02-15')
    expect(toDateInput(ms)).toBe('2026-02-15')
    expect(new Date(ms).getHours()).toBe(12)
  })

  test('keeps the day stable regardless of timezone offset', () => {
    const ms = fromDateInput('2026-01-01')
    expect(new Date(ms).getDate()).toBe(1)
    expect(new Date(ms).getMonth()).toBe(0)
  })

  test('describes due dates relative to today', () => {
    const now = Date.now()
    expect(relativeDue(now, now)).toBe('today')
    expect(relativeDue(now + DAY, now)).toBe('tomorrow')
    expect(relativeDue(now - DAY, now)).toBe('yesterday')
    expect(relativeDue(now - 4 * DAY, now)).toBe('4 days ago')
    expect(relativeDue(now + 6 * DAY, now)).toBe('in 6 days')
  })
})

describe('urgency', () => {
  const now = Date.now()

  test('flags a past-due open card as overdue', () => {
    expect(urgency(card({ date: now - DAY }), now)).toBe('overdue')
  })

  test('flags anything inside a week as due soon', () => {
    expect(urgency(card({ date: now + 3 * DAY }), now)).toBe('due-soon')
  })

  test('leaves later cards alone', () => {
    expect(urgency(card({ date: now + 20 * DAY }), now)).toBe('later')
  })

  test('never nags about a completed card', () => {
    expect(urgency(card({ date: now - 30 * DAY, status: 'paid' }), now)).toBe('done')
    expect(urgency(card({ type: 'income', status: 'received', date: now - DAY }), now)).toBe('done')
  })
})

describe('describeRecurrence', () => {
  test('describes a weekly rule', () => {
    expect(describeRecurrence({ frequency: 'weekly', interval: 1, weekday: 3 })).toBe(
      'Weekly on Wednesday',
    )
  })

  test('describes a biweekly rule, e.g. a paycheck', () => {
    expect(describeRecurrence({ frequency: 'weekly', interval: 2, weekday: 3 })).toBe(
      'Every 2 weeks on Wednesday',
    )
  })

  test('describes a monthly rule, e.g. a mortgage payment', () => {
    expect(describeRecurrence({ frequency: 'monthly', interval: 1, dayOfMonth: 1 })).toBe(
      'Monthly on the 1st',
    )
  })

  test('describes a multi-month rule with the right ordinal suffix', () => {
    expect(describeRecurrence({ frequency: 'monthly', interval: 3, dayOfMonth: 22 })).toBe(
      'Every 3 months on the 22nd',
    )
  })
})

describe('nextOccurrence', () => {
  test('lands on the next matching weekday, honoring the interval', () => {
    const wednesday = fromDateInput('2026-03-04') // a Wednesday
    const rule: Recurrence = { frequency: 'weekly', interval: 2, weekday: 3 }
    const next = nextOccurrence(wednesday, rule)
    expect(toDateInput(next)).toBe('2026-03-18')
    expect(new Date(next).getDay()).toBe(3)
  })

  test('finds the nearest future weekday for a weekly rule', () => {
    const monday = fromDateInput('2026-03-02') // a Monday
    const rule: Recurrence = { frequency: 'weekly', interval: 1, weekday: 3 }
    expect(toDateInput(nextOccurrence(monday, rule))).toBe('2026-03-04')
  })

  test('advances a monthly rule by the configured interval', () => {
    const jan1 = fromDateInput('2026-01-01')
    const rule: Recurrence = { frequency: 'monthly', interval: 1, dayOfMonth: 1 }
    expect(toDateInput(nextOccurrence(jan1, rule))).toBe('2026-02-01')
  })

  test('clamps a monthly rule to the last day of a shorter month', () => {
    const jan31 = fromDateInput('2026-01-31')
    const rule: Recurrence = { frequency: 'monthly', interval: 1, dayOfMonth: 31 }
    expect(toDateInput(nextOccurrence(jan31, rule))).toBe('2026-02-28')
  })
})

describe('occurrencesInRange', () => {
  test('a one-off card only lands on its own date', () => {
    const now = Date.now()
    const date = now + 10 * DAY
    expect(occurrencesInRange(card({ date, recurring: false }), now, now + 30 * DAY)).toEqual([
      date,
    ])
  })

  test('projects a biweekly paycheck across a wide horizon', () => {
    const now = fromDateInput('2026-09-06') // a Sunday
    const rule: Recurrence = { frequency: 'weekly', interval: 2, weekday: 3 }
    const paycheck = card({ date: now + 3 * DAY, recurring: true, recurrence: rule })

    const occurrences = occurrencesInRange(paycheck, now, now + 60 * DAY)
    expect(occurrences).toHaveLength(5)
    expect(occurrences.every((d) => new Date(d).getDay() === 3)).toBe(true)
    // ~14 days apart — rounded to absorb DST's odd hour across the range
    expect(
      occurrences.every((_, i, all) => i === 0 || Math.round((all[i] - all[i - 1]) / DAY) === 14),
    ).toBe(true)
  })

  test('always includes the card’s own date, even if overdue', () => {
    const now = Date.now()
    const rule: Recurrence = { frequency: 'monthly', interval: 1, dayOfMonth: 1 }
    const overdue = card({ date: now - 2 * DAY, recurring: true, recurrence: rule })

    const occurrences = occurrencesInRange(overdue, now, now + 30 * DAY)
    expect(occurrences[0]).toBe(overdue.date)
  })

  test('returns nothing once the card’s own date is past the horizon', () => {
    const now = Date.now()
    const rule: Recurrence = { frequency: 'monthly', interval: 1, dayOfMonth: 1 }
    const farOut = card({ date: now + 90 * DAY, recurring: true, recurrence: rule })
    expect(occurrencesInRange(farOut, now, now + 30 * DAY)).toEqual([])
  })
})

describe('lane vocabulary', () => {
  test('maps every status back to its lane', () => {
    expect(typeForStatus('upcoming')).toBe('expense')
    expect(typeForStatus('due')).toBe('expense')
    expect(typeForStatus('paid')).toBe('expense')
    expect(typeForStatus('expected')).toBe('income')
    expect(typeForStatus('received')).toBe('income')
  })

  test('labels statuses the way the columns are titled', () => {
    expect(statusLabel('upcoming')).toBe('Upcoming')
    expect(statusLabel('received')).toBe('Received')
  })
})
