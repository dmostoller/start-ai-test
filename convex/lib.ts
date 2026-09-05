import type { Doc } from './_generated/dataModel'

export const EXPENSE_STATUSES = ['upcoming', 'due', 'paid'] as const
export const INCOME_STATUSES = ['expected', 'received'] as const

export const COMPLETED_STATUSES = ['paid', 'received'] as const

export type CardDoc = Doc<'cards'>

export function isCompletedStatus(status: string) {
  return (COMPLETED_STATUSES as readonly string[]).includes(status)
}

export function statusesForType(type: 'income' | 'expense') {
  return type === 'expense' ? EXPENSE_STATUSES : INCOME_STATUSES
}

/** Default status a newly created card lands in. */
export function defaultStatus(type: 'income' | 'expense') {
  return type === 'expense' ? 'upcoming' : 'expected'
}
