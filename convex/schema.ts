import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const cardType = v.union(v.literal('income'), v.literal('expense'))

export const cardStatus = v.union(
  // expense lane
  v.literal('upcoming'),
  v.literal('due'),
  v.literal('paid'),
  // income lane
  v.literal('expected'),
  v.literal('received'),
)

export const cardPriority = v.union(
  v.literal('low'),
  v.literal('medium'),
  v.literal('high'),
)

export default defineSchema({
  cards: defineTable({
    userId: v.string(),
    type: cardType,
    amount: v.number(),
    description: v.string(),
    // due date / expected date, epoch millis
    date: v.number(),
    category: v.string(),
    priority: cardPriority,
    recurring: v.boolean(),
    source: v.optional(v.string()),
    status: cardStatus,
    // sort position within a column, ascending
    order: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_user_date', ['userId', 'date']),

  categories: defineTable({
    userId: v.string(),
    name: v.string(),
    type: cardType,
  }).index('by_user', ['userId']),

  settings: defineTable({
    userId: v.string(),
    horizonDays: v.number(),
    showCompleted: v.boolean(),
  }).index('by_user', ['userId']),
})
