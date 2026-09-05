import { useForm } from '@tanstack/react-form'
import { X } from 'lucide-react'
import { z } from 'zod'
import { LANES, fromDateInput, toDateInput, typeForStatus } from '#/lib/board'
import type { Card, CardPriority, CardStatus, CardType } from '#/lib/board'

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Enter an amount greater than zero'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Pick a category'),
  priority: z.enum(['low', 'medium', 'high']),
  recurring: z.boolean(),
  source: z.string(),
  status: z.enum(['upcoming', 'due', 'paid', 'expected', 'received']),
})

export type CardFormValues = z.infer<typeof schema>

export interface CardDraft {
  card?: Card
  status: CardStatus
}

function fieldError(errors: Array<unknown>) {
  const first = errors[0] as { message?: string } | string | undefined
  if (!first) return null
  return typeof first === 'string' ? first : (first.message ?? null)
}

export default function CardDialog({
  draft,
  categories,
  onClose,
  onSubmit,
  onAddCategory,
}: {
  draft: CardDraft
  categories: { expense: Array<string>; income: Array<string> }
  onClose: () => void
  onSubmit: (values: CardFormValues) => Promise<void> | void
  onAddCategory: (name: string, type: CardType) => Promise<unknown>
}) {
  const { card } = draft
  const initialType = card?.type ?? typeForStatus(draft.status)

  const form = useForm({
    defaultValues: {
      type: initialType,
      amount: card?.amount ?? 0,
      description: card?.description ?? '',
      date: toDateInput(card?.date ?? Date.now()),
      category: card?.category ?? categories[initialType][0],
      priority: card?.priority ?? 'medium',
      recurring: card?.recurring ?? false,
      source: card?.source ?? '',
      status: card?.status ?? draft.status,
    } satisfies CardFormValues,
    validators: { onChange: schema },
    onSubmit: async ({ value }) => {
      await onSubmit(value)
      onClose()
    },
  })

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={card ? 'Edit card' : 'New card'}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-5 shadow-2xl backdrop-blur-xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="ui-title text-lg font-semibold">
            {card ? 'Edit card' : 'New card'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
          className="flex flex-col gap-3"
        >
          <form.Field name="type">
            {(field) => (
              <div className="grid grid-cols-2 gap-2">
                {(['expense', 'income'] as Array<CardType>).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      field.handleChange(type)
                      const lane = LANES.find((l) => l.type === type)!
                      form.setFieldValue('status', lane.columns[0].status)
                      if (
                        !categories[type].includes(
                          form.getFieldValue('category'),
                        )
                      ) {
                        form.setFieldValue('category', categories[type][0])
                      }
                    }}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition ${
                      field.state.value === type
                        ? 'border-[var(--lagoon)] bg-[rgba(79,184,178,0.16)] text-[var(--lagoon-deep)]'
                        : 'border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-[var(--sea-ink)]">
                  Description
                </span>
                <input
                  className="ui-input"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Rent, Netflix, Paycheck…"
                />
                <FieldMessage errors={field.state.meta.errors} />
              </label>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-3">
            <form.Field name="amount">
              {(field) => (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-[var(--sea-ink)]">
                    Amount
                  </span>
                  <input
                    className="ui-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    onBlur={field.handleBlur}
                  />
                  <FieldMessage errors={field.state.meta.errors} />
                </label>
              )}
            </form.Field>

            <form.Field name="date">
              {(field) => (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-[var(--sea-ink)]">
                    Date
                  </span>
                  <input
                    className="ui-input"
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldMessage errors={field.state.meta.errors} />
                </label>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(state) => state.values.type}>
            {(type) => (
              <div className="grid grid-cols-2 gap-3">
                <form.Field name="category">
                  {(field) => (
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-[var(--sea-ink)]">
                        Category
                      </span>
                      <select
                        className="ui-select"
                        value={field.state.value}
                        onChange={async (e) => {
                          if (e.target.value === '__new__') {
                            const name = window.prompt('New category name')
                            if (name?.trim()) {
                              await onAddCategory(name.trim(), type)
                              field.handleChange(name.trim())
                            }
                            return
                          }
                          field.handleChange(e.target.value)
                        }}
                      >
                        {categories[type].map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                        <option value="__new__">+ New category…</option>
                      </select>
                      <FieldMessage errors={field.state.meta.errors} />
                    </label>
                  )}
                </form.Field>

                <form.Field name="status">
                  {(field) => (
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-[var(--sea-ink)]">
                        Column
                      </span>
                      <select
                        className="ui-select"
                        value={field.state.value}
                        onChange={(e) =>
                          field.handleChange(e.target.value as CardStatus)
                        }
                      >
                        {LANES.find((l) => l.type === type)!.columns.map(
                          (c) => (
                            <option key={c.status} value={c.status}>
                              {c.title}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}
                </form.Field>
              </div>
            )}
          </form.Subscribe>

          <div className="grid grid-cols-2 gap-3">
            <form.Field name="source">
              {(field) => (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-[var(--sea-ink)]">
                    Source{' '}
                    <span className="text-[var(--sea-ink-soft)]">
                      (optional)
                    </span>
                  </span>
                  <input
                    className="ui-input"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Payee or payer"
                  />
                </label>
              )}
            </form.Field>

            <form.Field name="priority">
              {(field) => (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-[var(--sea-ink)]">
                    Priority
                  </span>
                  <select
                    className="ui-select"
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.value as CardPriority)
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              )}
            </form.Field>
          </div>

          <form.Field name="recurring">
            {(field) => (
              <label className="flex items-center gap-2 text-sm text-[var(--sea-ink)]">
                <input
                  type="checkbox"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                />
                Recurring
              </label>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          >
            {([canSubmit, isSubmitting]) => (
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="ui-button ui-button-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="ui-button px-4 py-2"
                >
                  {isSubmitting
                    ? 'Saving…'
                    : card
                      ? 'Save changes'
                      : 'Add card'}
                </button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  )
}

function FieldMessage({ errors }: { errors: Array<unknown> }) {
  const message = fieldError(errors)
  if (!message) return null
  return <span className="text-xs text-[#b4462f]">{message}</span>
}

export function toCardMutationArgs(values: CardFormValues) {
  return {
    type: values.type,
    amount: values.amount,
    description: values.description.trim(),
    date: fromDateInput(values.date),
    category: values.category,
    priority: values.priority,
    recurring: values.recurring,
    source: values.source.trim() || undefined,
    status: values.status,
  }
}
