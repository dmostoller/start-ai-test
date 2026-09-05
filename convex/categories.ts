import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { cardType } from './schema'

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Rent/Mortgage',
  'Utilities',
  'Groceries',
  'Subscriptions',
  'Transportation',
  'Insurance',
  'Healthcare',
  'Entertainment',
  'Dining',
  'Shopping',
  'Debt Payment',
  'Other',
]

export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Refund',
  'Gift',
  'Investment',
  'Other',
]

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const custom = await ctx.db
      .query('categories')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const merge = (defaults: Array<string>, type: 'income' | 'expense') => {
      const names = custom.filter((c) => c.type === type).map((c) => c.name)
      return [...defaults, ...names.filter((n) => !defaults.includes(n))]
    }

    return {
      expense: merge(DEFAULT_EXPENSE_CATEGORIES, 'expense'),
      income: merge(DEFAULT_INCOME_CATEGORIES, 'income'),
      custom,
    }
  },
})

export const add = mutation({
  args: { userId: v.string(), name: v.string(), type: cardType },
  handler: async (ctx, { userId, name, type }) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Category name is required')

    const existing = await ctx.db
      .query('categories')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const dupe = existing.find(
      (c) => c.type === type && c.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (dupe) return dupe._id

    return await ctx.db.insert('categories', { userId, name: trimmed, type })
  },
})

export const remove = mutation({
  args: { userId: v.string(), id: v.id('categories') },
  handler: async (ctx, { userId, id }) => {
    const category = await ctx.db.get(id)
    if (!category || category.userId !== userId) {
      throw new Error('Category not found')
    }
    await ctx.db.delete(id)
  },
})
