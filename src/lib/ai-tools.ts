import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'
import { api } from '../../convex/_generated/api'
import { getConvexServerClient } from './convex-server'
import { DAY, formatCurrency, formatDate, fromDateInput } from './board'
import type { Id } from '../../convex/_generated/dataModel'

const cardTypeSchema = z.enum(['income', 'expense'])
const prioritySchema = z.enum(['low', 'medium', 'high'])
const statusSchema = z.enum(['upcoming', 'due', 'paid', 'expected', 'received'])

const dateSchema = z
  .string()
  .describe(
    'The due date or expected date as YYYY-MM-DD. Resolve relative phrases ' +
      'like "next Friday" or "the 15th" against today\'s date.',
  )

/** Parse a YYYY-MM-DD string at local noon so the day never shifts. */
function parseDate(value: string) {
  const ms = fromDateInput(value)
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid date "${value}" — expected YYYY-MM-DD`)
  }
  return ms
}

const cardSummary = z.object({
  id: z.string(),
  type: cardTypeSchema,
  amount: z.number(),
  description: z.string(),
  date: z.string(),
  category: z.string(),
  priority: prioritySchema,
  recurring: z.boolean(),
  source: z.string().optional(),
  status: statusSchema,
})

export interface CardFilters {
  type?: 'income' | 'expense'
  status?: z.infer<typeof statusSchema>
  category?: string
  recurring?: boolean
  search?: string
  withinDays?: number
  includeCompleted?: boolean
}

type CardRecord = {
  _id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  date: number
  category: string
  priority: 'low' | 'medium' | 'high'
  recurring: boolean
  source?: string
  status: z.infer<typeof statusSchema>
}

function summarize(card: CardRecord) {
  return {
    id: card._id,
    type: card.type,
    amount: card.amount,
    description: card.description,
    date: formatDate(card.date),
    category: card.category,
    priority: card.priority,
    recurring: card.recurring,
    source: card.source,
    status: card.status,
  }
}

/**
 * The filtering behind the `listCards` tool, kept pure so it can be tested
 * without a Convex deployment.
 */
export function filterCards<T extends CardRecord>(
  cards: Array<T>,
  filters: CardFilters,
  now = Date.now(),
): Array<T> {
  const search = filters.search?.toLowerCase()

  return cards.filter((card) => {
    if (filters.type && card.type !== filters.type) return false
    if (filters.status && card.status !== filters.status) return false
    if (
      filters.category &&
      card.category.toLowerCase() !== filters.category.toLowerCase()
    ) {
      return false
    }
    if (
      filters.recurring !== undefined &&
      card.recurring !== filters.recurring
    ) {
      return false
    }
    if (
      filters.includeCompleted === false &&
      (card.status === 'paid' || card.status === 'received')
    ) {
      return false
    }
    if (
      filters.withinDays !== undefined &&
      card.date > now + filters.withinDays * DAY
    ) {
      return false
    }
    if (search) {
      const haystack =
        `${card.description} ${card.source ?? ''} ${card.category}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })
}

/**
 * Tools are built per-request so the signed-in user's id is baked in and can
 * never be supplied (or spoofed) by the model.
 */
export function createBoardTools(userId: string) {
  const convex = getConvexServerClient()

  const createCard = toolDefinition({
    name: 'createCard',
    description:
      'Create a new income or expense card on the board. Use this whenever ' +
      'the user describes money coming in or going out.',
    inputSchema: z.object({
      type: cardTypeSchema,
      amount: z.number().describe('Dollar amount, always positive'),
      description: z.string().describe('Short label, e.g. "Rent" or "Netflix"'),
      date: dateSchema,
      category: z
        .string()
        .describe('Category name. Call suggestCategory first if unsure.'),
      priority: prioritySchema.optional(),
      recurring: z
        .boolean()
        .optional()
        .describe('True for subscriptions, rent, salary and other repeats'),
      source: z
        .string()
        .optional()
        .describe('Payee or payer, e.g. "Netflix" or "Employer"'),
      status: statusSchema
        .optional()
        .describe(
          'Column to place the card in. Defaults to upcoming (expense) or ' +
            'expected (income).',
        ),
    }),
    outputSchema: z.object({ id: z.string(), summary: z.string() }),
  }).server(async (input) => {
    const id = await convex.mutation(api.cards.create, {
      userId,
      ...input,
      date: parseDate(input.date),
    })
    return {
      id: String(id),
      summary: `Created ${input.type} card "${input.description}" for ${formatCurrency(
        input.amount,
      )} on ${input.date}`,
    }
  })

  const updateCard = toolDefinition({
    name: 'updateCard',
    description:
      'Update fields on an existing card. Call listCards first to find the id.',
    inputSchema: z.object({
      id: z.string(),
      type: cardTypeSchema.optional(),
      amount: z.number().optional(),
      description: z.string().optional(),
      date: dateSchema.optional(),
      category: z.string().optional(),
      priority: prioritySchema.optional(),
      recurring: z.boolean().optional(),
      source: z.string().optional(),
      status: statusSchema.optional(),
    }),
    outputSchema: z.object({ id: z.string(), summary: z.string() }),
  }).server(async ({ id, date, ...fields }) => {
    await convex.mutation(api.cards.update, {
      userId,
      id: id as Id<'cards'>,
      ...fields,
      ...(date ? { date: parseDate(date) } : {}),
    })
    return { id, summary: 'Card updated' }
  })

  const moveCard = toolDefinition({
    name: 'moveCard',
    description:
      'Move a card to a different column — for example marking a bill paid ' +
      'or income received.',
    inputSchema: z.object({ id: z.string(), status: statusSchema }),
    outputSchema: z.object({ id: z.string(), summary: z.string() }),
  }).server(async ({ id, status }) => {
    await convex.mutation(api.cards.move, {
      userId,
      id: id as Id<'cards'>,
      status,
    })
    return { id, summary: `Card moved to ${status}` }
  })

  const deleteCard = toolDefinition({
    name: 'deleteCard',
    description: 'Permanently delete a card. Confirm with the user first.',
    inputSchema: z.object({ id: z.string() }),
    outputSchema: z.object({ id: z.string(), summary: z.string() }),
  }).server(async ({ id }) => {
    await convex.mutation(api.cards.remove, {
      userId,
      id: id as Id<'cards'>,
    })
    return { id, summary: 'Card deleted' }
  })

  const listCards = toolDefinition({
    name: 'listCards',
    description:
      'List the cards on the board, optionally filtered. Use this to find ' +
      'card ids and to answer questions about what is on the board.',
    inputSchema: z.object({
      type: cardTypeSchema.optional(),
      status: statusSchema.optional(),
      category: z.string().optional(),
      recurring: z.boolean().optional(),
      search: z
        .string()
        .optional()
        .describe('Case-insensitive match against description and source'),
      withinDays: z
        .number()
        .optional()
        .describe('Only cards dated within this many days from today'),
      includeCompleted: z.boolean().optional(),
    }),
    outputSchema: z.object({
      count: z.number(),
      cards: z.array(cardSummary),
    }),
  }).server(async (filters) => {
    const cards: Array<CardRecord> = await convex.query(api.cards.list, {
      userId,
    })
    const matched = filterCards(cards, filters)

    return { count: matched.length, cards: matched.map(summarize) }
  })

  const queryBalance = toolDefinition({
    name: 'queryBalance',
    description:
      'Get totals for the board: upcoming expenses, expected income, net ' +
      'balance, overdue and due-soon counts.',
    inputSchema: z.object({
      withinDays: z
        .number()
        .optional()
        .describe('Time horizon in days. Defaults to 30.'),
    }),
    outputSchema: z.object({
      upcomingExpenses: z.number(),
      expectedIncome: z.number(),
      net: z.number(),
      overdueCount: z.number(),
      overdueAmount: z.number(),
      dueSoonCount: z.number(),
      dueSoonAmount: z.number(),
      horizonDays: z.number(),
    }),
  }).server(async ({ withinDays }) => {
    const horizonDays = withinDays ?? 30
    const stats = await convex.query(api.cards.stats, { userId, horizonDays })
    return { ...stats, horizonDays }
  })

  const suggestCategory = toolDefinition({
    name: 'suggestCategory',
    description:
      'List the categories available for a card type so you can pick an ' +
      'existing one instead of inventing a new name.',
    inputSchema: z.object({ type: cardTypeSchema }),
    outputSchema: z.object({ categories: z.array(z.string()) }),
  }).server(async ({ type }) => {
    const categories = await convex.query(api.categories.list, { userId })
    return { categories: categories[type] }
  })

  return [
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    listCards,
    queryBalance,
    suggestCategory,
  ]
}

export function boardSystemPrompt(now = new Date()) {
  return `You are the assistant inside Budget Board, a kanban board for personal cash flow.

Today's date is ${now.toDateString()} (${now.toISOString().slice(0, 10)}). Resolve every
relative date the user gives you ("the 15th", "next Friday", "monthly") against
that date and pass an absolute YYYY-MM-DD to the tools.

The board has two swimlanes:
- Expenses: columns "upcoming", "due", "paid"
- Income: columns "expected", "received"

Rules:
- When the user describes money moving, create or update cards with the tools —
  do not just describe what you would do.
- Amounts are always positive; the card type decides the direction.
- Before creating a card, pick a category from suggestCategory for that type.
  Only invent a category name when nothing existing fits.
- Mark subscriptions, rent, salary and similar repeats as recurring.
- To change or move an existing card, call listCards first to find its id.
- Never delete a card unless the user clearly asked for a deletion.
- Answer money questions with queryBalance or listCards rather than guessing.
- Keep replies short — one or two sentences confirming what changed. The board
  updates itself, so there is no need to restate every field.`
}
