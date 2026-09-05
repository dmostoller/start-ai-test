import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vite-plus/test'
import schema from './schema'
import { api } from './_generated/api'

const modules = import.meta.glob('./**/*.*s')
const USER = 'user_1'

describe('categories', () => {
  test('starts with the built-in suggestions', async () => {
    const t = convexTest(schema, modules)
    const categories = await t.query(api.categories.list, { userId: USER })

    expect(categories.expense).toContain('Rent/Mortgage')
    expect(categories.income).toContain('Salary')
    expect(categories.custom).toEqual([])
  })

  test('appends a custom category to its own type only', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.categories.add, {
      userId: USER,
      name: 'Dog',
      type: 'expense',
    })

    const categories = await t.query(api.categories.list, { userId: USER })
    expect(categories.expense).toContain('Dog')
    expect(categories.income).not.toContain('Dog')
  })

  test('is idempotent, ignoring case', async () => {
    const t = convexTest(schema, modules)
    const first = await t.mutation(api.categories.add, {
      userId: USER,
      name: 'Dog',
      type: 'expense',
    })
    const second = await t.mutation(api.categories.add, {
      userId: USER,
      name: 'dog',
      type: 'expense',
    })

    expect(second).toEqual(first)
    const categories = await t.query(api.categories.list, { userId: USER })
    expect(categories.custom).toHaveLength(1)
  })

  test('never duplicates a built-in name', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.categories.add, {
      userId: USER,
      name: 'Groceries',
      type: 'expense',
    })

    const categories = await t.query(api.categories.list, { userId: USER })
    expect(categories.expense.filter((c) => c === 'Groceries')).toHaveLength(1)
  })

  test('rejects an empty name', async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.mutation(api.categories.add, {
        userId: USER,
        name: '   ',
        type: 'expense',
      }),
    ).rejects.toThrow(/required/i)
  })

  test('removes only your own category', async () => {
    const t = convexTest(schema, modules)
    const id = await t.mutation(api.categories.add, {
      userId: USER,
      name: 'Dog',
      type: 'expense',
    })

    await expect(t.mutation(api.categories.remove, { userId: 'someone-else', id })).rejects.toThrow(
      /not found/i,
    )

    await t.mutation(api.categories.remove, { userId: USER, id })
    const categories = await t.query(api.categories.list, { userId: USER })
    expect(categories.custom).toEqual([])
  })
})

describe('settings', () => {
  test('falls back to defaults for a new user', async () => {
    const t = convexTest(schema, modules)
    expect(await t.query(api.settings.get, { userId: USER })).toEqual({
      horizonDays: 30,
      showCompleted: true,
    })
  })

  test('saves and then patches without clobbering the other field', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.settings.set, { userId: USER, horizonDays: 90 })
    await t.mutation(api.settings.set, { userId: USER, showCompleted: false })

    expect(await t.query(api.settings.get, { userId: USER })).toEqual({
      horizonDays: 90,
      showCompleted: false,
    })
  })

  test('keeps settings separate per user', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.settings.set, { userId: USER, horizonDays: 7 })

    expect(await t.query(api.settings.get, { userId: 'other' })).toEqual({
      horizonDays: 30,
      showCompleted: true,
    })
  })
})
