import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vite-plus/test'
import schema from './schema'
import { api } from './_generated/api'

const DAY = 24 * 60 * 60 * 1000
const USER = 'user_1'
const OTHER = 'user_2'

const modules = import.meta.glob('./**/*.*s')

function setup() {
  return convexTest(schema, modules)
}

function expenseArgs(overrides: Record<string, unknown> = {}) {
  return {
    userId: USER,
    type: 'expense' as const,
    amount: 1200,
    description: 'Rent',
    date: Date.now() + 5 * DAY,
    category: 'Rent/Mortgage',
    ...overrides,
  }
}

describe('cards.create', () => {
  test('defaults a new expense into the upcoming column', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs())
    const card = await t.query(api.cards.get, { userId: USER, id })

    expect(card).toMatchObject({
      status: 'upcoming',
      priority: 'medium',
      recurring: false,
    })
    expect(card?.completedAt).toBeUndefined()
  })

  test('defaults a new income card into the expected column', async () => {
    const t = setup()
    const id = await t.mutation(
      api.cards.create,
      expenseArgs({
        type: 'income',
        category: 'Salary',
        description: 'Payday',
      }),
    )
    const card = await t.query(api.cards.get, { userId: USER, id })
    expect(card?.status).toBe('expected')
  })

  test('stamps completedAt when a card starts out paid', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs({ status: 'paid' }))
    const card = await t.query(api.cards.get, { userId: USER, id })
    expect(card?.completedAt).toEqual(expect.any(Number))
  })

  test('rejects a status from the other swimlane', async () => {
    const t = setup()
    await expect(t.mutation(api.cards.create, expenseArgs({ status: 'received' }))).rejects.toThrow(
      /not valid for a expense card/,
    )
  })

  test('rejects a negative amount', async () => {
    const t = setup()
    await expect(t.mutation(api.cards.create, expenseArgs({ amount: -5 }))).rejects.toThrow(
      /positive/,
    )
  })

  test('appends new cards to the end of their column', async () => {
    const t = setup()
    const first = await t.mutation(api.cards.create, expenseArgs())
    const second = await t.mutation(api.cards.create, expenseArgs({ description: 'Power' }))

    const cards = await t.query(api.cards.list, { userId: USER })
    expect(cards.map((c) => c._id)).toEqual([first, second])
  })
})

describe('cards.list', () => {
  test('only returns the requesting user’s cards', async () => {
    const t = setup()
    await t.mutation(api.cards.create, expenseArgs())
    await t.mutation(api.cards.create, expenseArgs({ userId: OTHER }))

    const cards = await t.query(api.cards.list, { userId: USER })
    expect(cards).toHaveLength(1)
    expect(cards[0].userId).toBe(USER)
  })

  test('get refuses to read another user’s card', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs())
    expect(await t.query(api.cards.get, { userId: OTHER, id })).toBeNull()
  })
})

describe('cards.update', () => {
  test('patches only the fields it is given', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs())
    await t.mutation(api.cards.update, { userId: USER, id, amount: 1300 })

    const card = await t.query(api.cards.get, { userId: USER, id })
    expect(card).toMatchObject({ amount: 1300, description: 'Rent' })
  })

  test('marks a card completed when it is moved to paid', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs())
    await t.mutation(api.cards.update, { userId: USER, id, status: 'paid' })

    const card = await t.query(api.cards.get, { userId: USER, id })
    expect(card?.status).toBe('paid')
    expect(card?.completedAt).toEqual(expect.any(Number))
  })

  test('clears completedAt when a paid card is reopened', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs({ status: 'paid' }))
    await t.mutation(api.cards.update, { userId: USER, id, status: 'due' })

    const card = await t.query(api.cards.get, { userId: USER, id })
    expect(card?.completedAt).toBeUndefined()
  })

  test('moves the card to the other lane when its type changes', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs())
    await t.mutation(api.cards.update, { userId: USER, id, type: 'income' })

    const card = await t.query(api.cards.get, { userId: USER, id })
    expect(card).toMatchObject({ type: 'income', status: 'expected' })
  })

  test('refuses to touch another user’s card', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs())
    await expect(t.mutation(api.cards.update, { userId: OTHER, id, amount: 1 })).rejects.toThrow(
      /not found/i,
    )
  })

  test('drops the recurrence rule when recurring is turned off', async () => {
    const t = setup()
    const id = await t.mutation(
      api.cards.create,
      expenseArgs({
        recurring: true,
        recurrence: { frequency: 'weekly', interval: 2, weekday: 3 },
      }),
    )
    await t.mutation(api.cards.update, { userId: USER, id, recurring: false })

    const card = await t.query(api.cards.get, { userId: USER, id })
    expect(card).toMatchObject({ recurring: false })
    expect(card?.recurrence).toBeUndefined()
  })
})

describe('cards.move', () => {
  test('drops a card between two others', async () => {
    const t = setup()
    const a = await t.mutation(api.cards.create, expenseArgs({ description: 'A' }))
    const b = await t.mutation(api.cards.create, expenseArgs({ description: 'B' }))
    const c = await t.mutation(api.cards.create, expenseArgs({ description: 'C' }))

    const before = await t.query(api.cards.list, { userId: USER })
    const orders = new Map(before.map((card) => [card._id, card.order]))

    await t.mutation(api.cards.move, {
      userId: USER,
      id: c,
      status: 'upcoming',
      afterOrder: orders.get(a),
      beforeOrder: orders.get(b),
    })

    const after = await t.query(api.cards.list, { userId: USER })
    expect(after.map((card) => card.description)).toEqual(['A', 'C', 'B'])
    expect(after.map((card) => card._id)).toEqual([a, c, b])
  })

  test('drops a card at the top of a column', async () => {
    const t = setup()
    const a = await t.mutation(api.cards.create, expenseArgs({ description: 'A' }))
    const b = await t.mutation(api.cards.create, expenseArgs({ description: 'B' }))
    const [first] = await t.query(api.cards.list, { userId: USER })

    await t.mutation(api.cards.move, {
      userId: USER,
      id: b,
      status: 'upcoming',
      beforeOrder: first.order,
    })

    const after = await t.query(api.cards.list, { userId: USER })
    expect(after.map((card) => card._id)).toEqual([b, a])
  })

  test('refuses a column from the other swimlane', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs())
    await expect(
      t.mutation(api.cards.move, { userId: USER, id, status: 'received' }),
    ).rejects.toThrow(/not valid for a expense card/)
  })

  test('keeps the original completedAt when reordering inside paid', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs({ status: 'paid' }))
    const first = await t.query(api.cards.get, { userId: USER, id })

    await t.mutation(api.cards.move, { userId: USER, id, status: 'paid' })
    const second = await t.query(api.cards.get, { userId: USER, id })

    expect(second?.completedAt).toBe(first?.completedAt)
  })
})

describe('cards.remove and repeat', () => {
  test('removes a card', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs())
    await t.mutation(api.cards.remove, { userId: USER, id })
    expect(await t.query(api.cards.list, { userId: USER })).toHaveLength(0)
  })

  test('refuses to remove another user’s card', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs())
    await expect(t.mutation(api.cards.remove, { userId: OTHER, id })).rejects.toThrow(/not found/i)
  })

  test('repeat copies a paid card forward into a fresh column', async () => {
    const t = setup()
    const id = await t.mutation(api.cards.create, expenseArgs({ status: 'paid', recurring: true }))
    const original = await t.query(api.cards.get, { userId: USER, id })

    const copyId = await t.mutation(api.cards.repeat, { userId: USER, id })
    const copy = await t.query(api.cards.get, { userId: USER, id: copyId })

    expect(copy).toMatchObject({
      description: original!.description,
      amount: original!.amount,
      status: 'upcoming',
      recurring: true,
    })
    expect(copy!.date).toBe(original!.date + 30 * DAY)
    expect(copy!.completedAt).toBeUndefined()
  })

  test('repeat carries the recurrence rule forward and honors an explicit date', async () => {
    const t = setup()
    const recurrence = { frequency: 'monthly' as const, interval: 1, dayOfMonth: 1 }
    const id = await t.mutation(
      api.cards.create,
      expenseArgs({ status: 'paid', recurring: true, recurrence }),
    )
    const original = await t.query(api.cards.get, { userId: USER, id })

    const nextDate = original!.date + 45 * DAY
    const copyId = await t.mutation(api.cards.repeat, { userId: USER, id, date: nextDate })
    const copy = await t.query(api.cards.get, { userId: USER, id: copyId })

    expect(copy?.date).toBe(nextDate)
    expect(copy?.recurrence).toEqual(recurrence)
  })
})

describe('cards.stats', () => {
  test('totals open cards inside the horizon and counts what is late', async () => {
    const t = setup()
    // overdue expense
    await t.mutation(api.cards.create, expenseArgs({ amount: 100, date: Date.now() - 2 * DAY }))
    // due within the week
    await t.mutation(api.cards.create, expenseArgs({ amount: 50, date: Date.now() + 3 * DAY }))
    // beyond the 30 day horizon
    await t.mutation(api.cards.create, expenseArgs({ amount: 999, date: Date.now() + 90 * DAY }))
    // already paid, so not part of what is owed
    await t.mutation(api.cards.create, expenseArgs({ amount: 70, status: 'paid' }))
    // income
    await t.mutation(
      api.cards.create,
      expenseArgs({
        type: 'income',
        category: 'Salary',
        amount: 500,
        date: Date.now() + 4 * DAY,
      }),
    )

    const stats = await t.query(api.cards.stats, { userId: USER })

    expect(stats).toMatchObject({
      upcomingExpenses: 150,
      expectedIncome: 500,
      net: 350,
      overdueCount: 1,
      overdueAmount: 100,
      dueSoonCount: 1,
      dueSoonAmount: 50,
      totalCards: 5,
    })
  })

  test('widening the horizon pulls in later cards', async () => {
    const t = setup()
    await t.mutation(api.cards.create, expenseArgs({ amount: 999, date: Date.now() + 90 * DAY }))

    expect((await t.query(api.cards.stats, { userId: USER })).upcomingExpenses).toBe(0)
    expect(
      (await t.query(api.cards.stats, { userId: USER, horizonDays: 120 })).upcomingExpenses,
    ).toBe(999)
  })

  test('projects a recurring card’s future occurrences into the totals', async () => {
    const t = setup()
    // a biweekly paycheck, due soon, repeating across a full year
    await t.mutation(
      api.cards.create,
      expenseArgs({
        type: 'income',
        category: 'Salary',
        amount: 3500,
        date: Date.now() + 2 * DAY,
        recurring: true,
        recurrence: { frequency: 'weekly', interval: 2, weekday: new Date().getDay() },
        status: 'expected',
      }),
    )

    const stats = await t.query(api.cards.stats, { userId: USER, horizonDays: 365 })
    // roughly 26 paydays a year — comfortably more than the single-card total
    expect(stats.expectedIncome).toBeGreaterThan(3500 * 20)
  })

  test('does not project a completed recurring card forward', async () => {
    const t = setup()
    await t.mutation(
      api.cards.create,
      expenseArgs({
        type: 'income',
        category: 'Salary',
        amount: 3500,
        status: 'received',
        recurring: true,
        recurrence: { frequency: 'weekly', interval: 2, weekday: new Date().getDay() },
      }),
    )

    const stats = await t.query(api.cards.stats, { userId: USER, horizonDays: 365 })
    expect(stats.expectedIncome).toBe(0)
  })
})
