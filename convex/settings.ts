import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const DEFAULT_SETTINGS = { horizonDays: 30, showCompleted: true }

export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const row = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    return {
      horizonDays: row?.horizonDays ?? DEFAULT_SETTINGS.horizonDays,
      showCompleted: row?.showCompleted ?? DEFAULT_SETTINGS.showCompleted,
    }
  },
})

export const set = mutation({
  args: {
    userId: v.string(),
    horizonDays: v.optional(v.number()),
    showCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, ...fields }) => {
    const row = await ctx.db
      .query('settings')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()

    if (!row) {
      return await ctx.db.insert('settings', {
        userId,
        horizonDays: fields.horizonDays ?? DEFAULT_SETTINGS.horizonDays,
        showCompleted: fields.showCompleted ?? DEFAULT_SETTINGS.showCompleted,
      })
    }

    await ctx.db.patch(row._id, {
      horizonDays: fields.horizonDays ?? row.horizonDays,
      showCompleted: fields.showCompleted ?? row.showCompleted,
    })
    return row._id
  },
})
