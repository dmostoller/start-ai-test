import { describe, expect, test } from 'vite-plus/test'
import { boardSystemPrompt, filterCards } from './ai-tools'
import { DAY } from './board'

const now = new Date(2026, 4, 10, 9).getTime()

type Row = Parameters<typeof filterCards>[0][number]

function row(overrides: Partial<Row> = {}): Row {
  return {
    _id: 'card_1',
    type: 'expense',
    amount: 100,
    description: 'Netflix',
    date: now + 3 * DAY,
    category: 'Subscriptions',
    priority: 'medium',
    recurring: true,
    source: 'Netflix',
    status: 'upcoming',
    ...overrides,
  }
}

describe('filterCards', () => {
  const cards = [
    row({ _id: 'sub', recurring: true }),
    row({
      _id: 'rent',
      description: 'Rent',
      category: 'Rent/Mortgage',
      source: 'Landlord',
      recurring: true,
      amount: 1200,
    }),
    row({
      _id: 'paid',
      description: 'Power',
      category: 'Utilities',
      source: 'Utility co',
      status: 'paid',
      recurring: false,
    }),
    row({
      _id: 'pay',
      type: 'income',
      status: 'expected',
      description: 'Paycheck',
      category: 'Salary',
      source: 'Employer',
      recurring: false,
    }),
    row({
      _id: 'far',
      description: 'Insurance',
      category: 'Insurance',
      source: 'Insurer',
      recurring: false,
      date: now + 100 * DAY,
    }),
  ]

  const ids = (filters: Parameters<typeof filterCards>[1]) =>
    filterCards(cards, filters, now).map((c) => c._id)

  test('returns everything with no filters', () => {
    expect(ids({})).toHaveLength(cards.length)
  })

  test('filters by type and status', () => {
    expect(ids({ type: 'income' })).toEqual(['pay'])
    expect(ids({ status: 'paid' })).toEqual(['paid'])
  })

  test('matches categories case-insensitively', () => {
    expect(ids({ category: 'rent/mortgage' })).toEqual(['rent'])
  })

  test('finds subscriptions through the recurring flag', () => {
    expect(ids({ recurring: true })).toEqual(['sub', 'rent'])
  })

  test('searches description, source and category', () => {
    expect(ids({ search: 'netflix' })).toEqual(['sub'])
    expect(ids({ search: 'landlord' })).toEqual(['rent'])
    expect(ids({ search: 'salary' })).toEqual(['pay'])
  })

  test('excludes completed cards on request', () => {
    expect(ids({ includeCompleted: false })).not.toContain('paid')
    expect(ids({})).toContain('paid')
  })

  test('honours a day window', () => {
    expect(ids({ withinDays: 7 })).not.toContain('far')
    expect(ids({ withinDays: 120 })).toContain('far')
  })

  test('combines filters', () => {
    expect(ids({ type: 'expense', recurring: true, search: 'rent' })).toEqual(['rent'])
  })
})

describe('boardSystemPrompt', () => {
  test('pins today so the model can resolve relative dates', () => {
    const prompt = boardSystemPrompt(new Date(2026, 4, 10, 9))
    expect(prompt).toContain('2026-05-10')
  })

  test('names both swimlanes and all five columns', () => {
    const prompt = boardSystemPrompt()
    for (const word of ['upcoming', 'due', 'paid', 'expected', 'received']) {
      expect(prompt).toContain(word)
    }
  })
})
