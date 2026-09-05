import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { cardPriority, cardStatus, cardType } from './schema'
import { isCompletedStatus, statusesForType } from './lib'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

const DAY = 24 * 60 * 60 * 1000

async function ownedCard(ctx: MutationCtx, userId: string, id: Id<'cards'>) {
  const card = await ctx.db.get(id)
  if (!card || card.userId !== userId) {
    throw new Error('Card not found')
  }
  return card
}

/** Next order value at the end of a column. */
async function nextOrder(ctx: MutationCtx, userId: string, status: string) {
  const last = await ctx.db
    .query('cards')
    .withIndex('by_user_status', (q) =>
      q.eq('userId', userId).eq('status', status as any),
    )
    .collect()
  return last.reduce((max, c) => Math.max(max, c.order), 0) + 1000
}

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const cards = await ctx.db
      .query('cards')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    return cards.sort((a, b) => a.order - b.order)
  },
})

export const get = query({
  args: { userId: v.string(), id: v.id('cards') },
  handler: async (ctx, { userId, id }) => {
    const card = await ctx.db.get(id)
    return card && card.userId === userId ? card : null
  },
})

export const create = mutation({
  args: {
    userId: v.string(),
    type: cardType,
    amount: v.number(),
    description: v.string(),
    date: v.number(),
    category: v.string(),
    priority: v.optional(cardPriority),
    recurring: v.optional(v.boolean()),
    source: v.optional(v.string()),
    status: v.optional(cardStatus),
  },
  handler: async (ctx, args) => {
    const status =
      args.status ?? (args.type === 'expense' ? 'upcoming' : 'expected')
    if (!(statusesForType(args.type) as readonly string[]).includes(status)) {
      throw new Error(`Status "${status}" is not valid for a ${args.type} card`)
    }
    if (args.amount < 0) {
      throw new Error('Amount must be a positive number')
    }
    const now = Date.now()
    return await ctx.db.insert('cards', {
      userId: args.userId,
      type: args.type,
      amount: args.amount,
      description: args.description,
      date: args.date,
      category: args.category,
      priority: args.priority ?? 'medium',
      recurring: args.recurring ?? false,
      source: args.source,
      status,
      order: await nextOrder(ctx, args.userId, status),
      createdAt: now,
      completedAt: isCompletedStatus(status) ? now : undefined,
    })
  },
})

export const update = mutation({
  args: {
    userId: v.string(),
    id: v.id('cards'),
    type: v.optional(cardType),
    amount: v.optional(v.number()),
    description: v.optional(v.string()),
    date: v.optional(v.number()),
    category: v.optional(v.string()),
    priority: v.optional(cardPriority),
    recurring: v.optional(v.boolean()),
    source: v.optional(v.string()),
    status: v.optional(cardStatus),
  },
  handler: async (ctx, { userId, id, ...fields }) => {
    const card = await ownedCard(ctx, userId, id)
    const type = fields.type ?? card.type
    const patch: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(fields) as Array<
      [string, unknown]
    >) {
      if (value !== undefined) patch[key] = value
    }

    // Changing type moves the card to the default column of the other lane
    // unless an explicit, valid status came with the update.
    const status = (patch.status as string | undefined) ?? card.status
    if (!(statusesForType(type) as readonly string[]).includes(status)) {
      patch.status = type === 'expense' ? 'upcoming' : 'expected'
    }

    if (patch.status && patch.status !== card.status) {
      patch.order = await nextOrder(ctx, userId, patch.status as string)
      patch.completedAt = isCompletedStatus(patch.status as string)
        ? Date.now()
        : undefined
    }

    await ctx.db.patch(id, patch)
    return id
  },
})

export const move = mutation({
  args: {
    userId: v.string(),
    id: v.id('cards'),
    status: cardStatus,
    // order of the card this one was dropped before, if any
    beforeOrder: v.optional(v.number()),
    afterOrder: v.optional(v.number()),
  },
  handler: async (ctx, { userId, id, status, beforeOrder, afterOrder }) => {
    const card = await ownedCard(ctx, userId, id)
    if (!(statusesForType(card.type) as readonly string[]).includes(status)) {
      throw new Error(`Status "${status}" is not valid for a ${card.type} card`)
    }

    let order: number
    if (afterOrder !== undefined && beforeOrder !== undefined) {
      order = (afterOrder + beforeOrder) / 2
    } else if (beforeOrder !== undefined) {
      order = beforeOrder - 1000
    } else if (afterOrder !== undefined) {
      order = afterOrder + 1000
    } else {
      order = await nextOrder(ctx, userId, status)
    }

    await ctx.db.patch(id, {
      status,
      order,
      completedAt: isCompletedStatus(status)
        ? (card.completedAt ?? Date.now())
        : undefined,
    })
    return id
  },
})

export const remove = mutation({
  args: { userId: v.string(), id: v.id('cards') },
  handler: async (ctx, { userId, id }) => {
    await ownedCard(ctx, userId, id)
    await ctx.db.delete(id)
  },
})

/** Duplicate a recurring card into the next period. */
export const repeat = mutation({
  args: {
    userId: v.string(),
    id: v.id('cards'),
    days: v.optional(v.number()),
  },
  handler: async (ctx, { userId, id, days }) => {
    const card = await ownedCard(ctx, userId, id)
    const status = card.type === 'expense' ? 'upcoming' : 'expected'
    return await ctx.db.insert('cards', {
      userId: card.userId,
      type: card.type,
      amount: card.amount,
      description: card.description,
      date: card.date + (days ?? 30) * DAY,
      category: card.category,
      priority: card.priority,
      recurring: true,
      source: card.source,
      status,
      order: await nextOrder(ctx, userId, status),
      createdAt: Date.now(),
    })
  },
})

/** Aggregate totals used by the info bar and by the AI's balance queries. */
export const stats = query({
  args: { userId: v.string(), horizonDays: v.optional(v.number()) },
  handler: async (ctx, { userId, horizonDays }) => {
    const cards = await ctx.db
      .query('cards')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()

    const now = Date.now()
    const horizon = now + (horizonDays ?? 30) * DAY
    const inRange = cards.filter((c) => c.date <= horizon)

    const open = inRange.filter((c) => !isCompletedStatus(c.status))
    const upcomingExpenses = open
      .filter((c) => c.type === 'expense')
      .reduce((sum, c) => sum + c.amount, 0)
    const expectedIncome = open
      .filter((c) => c.type === 'income')
      .reduce((sum, c) => sum + c.amount, 0)

    const overdue = open.filter((c) => c.type === 'expense' && c.date < now)
    const dueSoon = open.filter(
      (c) => c.type === 'expense' && c.date >= now && c.date <= now + 7 * DAY,
    )

    return {
      upcomingExpenses,
      expectedIncome,
      net: expectedIncome - upcomingExpenses,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((sum, c) => sum + c.amount, 0),
      dueSoonCount: dueSoon.length,
      dueSoonAmount: dueSoon.reduce((sum, c) => sum + c.amount, 0),
      totalCards: cards.length,
    }
  },
})
