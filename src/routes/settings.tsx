import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useForm } from '@tanstack/react-form'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { api } from '../../convex/_generated/api'
import { HORIZON_OPTIONS } from '#/lib/board'
import { fieldErrorMessage } from '#/lib/form'
import { pushToast, withToast } from '#/lib/toast'
import { useUserId } from '#/lib/user'
import type { CardType } from '#/lib/board'

export const Route = createFileRoute('/settings')({ component: Settings })

function FieldError({ errors }: { errors: Array<unknown> }) {
  const message = fieldErrorMessage(errors)
  if (!message) return null
  return <span className="text-xs text-[#b4462f]">{message}</span>
}

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(40, 'Keep it short'),
  type: z.enum(['income', 'expense']),
})

function Settings() {
  const { userId, isPending, user } = useUserId()

  if (isPending) {
    return (
      <main className="ui-page">
        <p className="ui-muted text-sm">Loading…</p>
      </main>
    )
  }

  if (!userId) {
    return (
      <main className="ui-page">
        <p className="text-sm text-[var(--sea-ink-soft)]">
          <Link to="/signin" className="font-semibold text-[var(--lagoon-deep)]">
            Sign in
          </Link>{' '}
          to change your settings.
        </p>
      </main>
    )
  }

  return <SettingsForm userId={userId} email={user?.email} />
}

function SettingsForm({ userId, email }: { userId: string; email?: string | null }) {
  const settings = useQuery(api.settings.get, { userId })
  const categories = useQuery(api.categories.list, { userId })
  const saveSettings = useMutation(api.settings.set)
  const addCategory = useMutation(api.categories.add)
  const removeCategory = useMutation(api.categories.remove)

  const form = useForm({
    defaultValues: { name: '', type: 'expense' as CardType },
    validators: { onSubmit: categorySchema },
    onSubmit: async ({ value, formApi }) => {
      const created = await withToast(addCategory({ userId, name: value.name, type: value.type }), {
        error: 'Could not add that category',
      })
      if (created) {
        pushToast(`Added “${value.name.trim()}”`)
        formApi.reset()
      }
    },
  })

  return (
    <main className="ui-page">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--sea-ink-soft)] no-underline hover:text-[var(--sea-ink)]"
      >
        <ArrowLeft size={15} /> Back to the board
      </Link>

      <h1 className="display-title mb-6 text-2xl font-bold text-[var(--sea-ink)]">Settings</h1>

      <section className="ui-card mb-4 p-5">
        <h2 className="ui-section-title mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
          Board
        </h2>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[var(--sea-ink)]">Time horizon</span>
            <span className="text-xs text-[var(--sea-ink-soft)]">
              How far ahead the board and the totals look.
            </span>
            <select
              className="ui-select ui-input-fit mt-1"
              value={settings?.horizonDays ?? 30}
              onChange={(e) =>
                void withToast(saveSettings({ userId, horizonDays: Number(e.target.value) }), {
                  error: 'Could not save your horizon',
                })
              }
            >
              {HORIZON_OPTIONS.map((o) => (
                <option key={o.days} value={o.days}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-[var(--sea-ink)]">
            <input
              type="checkbox"
              checked={settings?.showCompleted ?? true}
              onChange={(e) =>
                void withToast(saveSettings({ userId, showCompleted: e.target.checked }), {
                  error: 'Could not save that setting',
                })
              }
            />
            Show paid and received cards
          </label>
        </div>
      </section>

      <section className="ui-card mb-4 p-5">
        <h2 className="ui-section-title mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
          Categories
        </h2>
        <p className="ui-muted mb-4 text-xs">
          The built-in categories are always available. Anything you add here shows up in the card
          editor and in the assistant’s suggestions.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
          className="mb-5 flex flex-wrap items-start gap-2"
        >
          <form.Field name="name">
            {(field) => (
              <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <input
                  className="ui-input"
                  placeholder="New category"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError errors={field.state.meta.errors} />
              </div>
            )}
          </form.Field>

          <form.Field name="type">
            {(field) => (
              <select
                className="ui-select ui-input-fit"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value as CardType)}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            )}
          </form.Field>

          <button type="submit" className="ui-button px-4 py-2 text-sm">
            Add
          </button>
        </form>

        {categories === undefined ? (
          <p className="ui-muted text-sm">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(['expense', 'income'] as Array<CardType>).map((type) => (
              <div key={type}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  {type}
                </h3>
                <ul className="flex flex-wrap gap-1.5">
                  {categories[type].map((name) => {
                    const custom = categories.custom.find((c) => c.type === type && c.name === name)
                    return (
                      <li key={name} className="ui-pill inline-flex items-center gap-1.5">
                        {name}
                        {custom ? (
                          <button
                            type="button"
                            aria-label={`Remove ${name}`}
                            onClick={() =>
                              void withToast(
                                removeCategory({
                                  userId,
                                  id: custom._id,
                                }),
                                { error: 'Could not remove that category' },
                              )
                            }
                            className="text-[var(--sea-ink-soft)] hover:text-[#b4462f]"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="ui-card p-5">
        <h2 className="ui-section-title mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
          Account
        </h2>
        <p className="text-sm text-[var(--sea-ink)]">{email ?? 'Signed in'}</p>
        <p className="ui-muted mt-1 text-xs">
          Cards, categories and settings are stored per account. Removing a custom category leaves
          existing cards untouched.
        </p>
      </section>
    </main>
  )
}
