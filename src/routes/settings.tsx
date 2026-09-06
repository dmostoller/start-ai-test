import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useForm } from '@tanstack/react-form'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { api } from '../../convex/_generated/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { HORIZON_OPTIONS } from '#/lib/board'
import { fieldErrorMessage } from '#/lib/form'
import { pushToast, withToast } from '#/lib/toast'
import { useUserId } from '#/lib/user'
import type { CardType } from '#/lib/board'

export const Route = createFileRoute('/settings')({ component: Settings })

function FieldError({ errors }: { errors: Array<unknown> }) {
  const message = fieldErrorMessage(errors)
  if (!message) return null
  return <span className="text-xs text-destructive">{message}</span>
}

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(40, 'Keep it short'),
  type: z.enum(['income', 'expense']),
})

function Settings() {
  const { userId, isPending, user } = useUserId()

  if (isPending) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    )
  }

  if (!userId) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-12">
        <p className="text-sm text-muted-foreground">
          <Link
            to="/signin"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
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
    <main className="mx-auto w-full max-w-6xl px-4 py-12">
      <Button variant="link" className="mb-4 px-0" render={<Link to="/" />}>
        <ArrowLeft size={15} /> Back to the board
      </Button>

      <h1 className="mb-6 text-2xl font-bold text-foreground">Settings</h1>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Board
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Label className="flex flex-col items-start gap-1">
            <span className="font-medium text-foreground">Time horizon</span>
            <span className="text-xs font-normal text-muted-foreground">
              How far ahead the board and the totals look.
            </span>
            <Select
              value={String(settings?.horizonDays ?? 30)}
              onValueChange={(value) =>
                void withToast(saveSettings({ userId, horizonDays: Number(value) }), {
                  error: 'Could not save your horizon',
                })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORIZON_OPTIONS.map((o) => (
                  <SelectItem key={o.days} value={String(o.days)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Label>

          <Label>
            <Switch
              checked={settings?.showCompleted ?? true}
              onCheckedChange={(checked) =>
                void withToast(saveSettings({ userId, showCompleted: checked }), {
                  error: 'Could not save that setting',
                })
              }
            />
            Show paid and received cards
          </Label>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Categories
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            The built-in categories are always available. Anything you add here shows up in the card
            editor and in the assistant’s suggestions.
          </p>
        </CardHeader>
        <CardContent>
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
                  <Input
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
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value as CardType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </form.Field>

            <Button type="submit">Add</Button>
          </form>

          {categories === undefined ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(['expense', 'income'] as Array<CardType>).map((type) => (
                <div key={type}>
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {type}
                  </h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {categories[type].map((name) => {
                      const custom = categories.custom.find(
                        (c) => c.type === type && c.name === name,
                      )
                      return (
                        <li key={name}>
                          <Badge variant="secondary" className="gap-1.5">
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
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={12} />
                              </button>
                            ) : null}
                          </Badge>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{email ?? 'Signed in'}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cards, categories and settings are stored per account. Removing a custom category leaves
            existing cards untouched.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
