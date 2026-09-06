import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LANES,
  WEEKDAYS,
  describeRecurrence,
  fromDateInput,
  toDateInput,
  typeForStatus,
} from '#/lib/board'
import { fieldErrorMessage } from '#/lib/form'
import type { Card, CardPriority, CardStatus, CardType, Recurrence } from '#/lib/board'

const recurrenceSchema = z.object({
  frequency: z.enum(['weekly', 'monthly']),
  interval: z.number().int().min(1),
  weekday: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
})

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Enter an amount greater than zero'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Pick a category'),
  priority: z.enum(['low', 'medium', 'high']),
  recurring: z.boolean(),
  recurrence: recurrenceSchema.nullable(),
  source: z.string(),
  status: z.enum(['upcoming', 'due', 'paid', 'expected', 'received']),
})

export type CardFormValues = z.infer<typeof schema>

export interface CardDraft {
  card?: Card
  status: CardStatus
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
      recurrence: card?.recurrence ?? null,
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{card ? 'Edit card' : 'New card'}</DialogTitle>
        </DialogHeader>

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
                  <Button
                    key={type}
                    type="button"
                    variant={field.state.value === type ? 'default' : 'outline'}
                    className="capitalize"
                    onClick={() => {
                      field.handleChange(type)
                      const lane = LANES.find((l) => l.type === type)!
                      form.setFieldValue('status', lane.columns[0].status)
                      if (!categories[type].includes(form.getFieldValue('category'))) {
                        form.setFieldValue('category', categories[type][0])
                      }
                    }}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <Label className="flex flex-col items-start gap-1">
                Description
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Rent, Netflix, Paycheck…"
                />
                <FieldMessage errors={field.state.meta.errors} />
              </Label>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-3">
            <form.Field name="amount">
              {(field) => (
                <Label className="flex flex-col items-start gap-1">
                  Amount
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    onBlur={field.handleBlur}
                  />
                  <FieldMessage errors={field.state.meta.errors} />
                </Label>
              )}
            </form.Field>

            <form.Field name="date">
              {(field) => (
                <Label className="flex flex-col items-start gap-1">
                  Date
                  <Input
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldMessage errors={field.state.meta.errors} />
                </Label>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(state) => state.values.type}>
            {(type) => (
              <div className="grid grid-cols-2 gap-3">
                <form.Field name="category">
                  {(field) => (
                    <Label className="flex flex-col items-start gap-1">
                      Category
                      <Select
                        value={field.state.value}
                        onValueChange={async (value) => {
                          if (value === null) return
                          if (value === '__new__') {
                            const name = window.prompt('New category name')
                            if (name?.trim()) {
                              await onAddCategory(name.trim(), type)
                              field.handleChange(name.trim())
                            }
                            return
                          }
                          field.handleChange(value)
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories[type].map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new__">+ New category…</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldMessage errors={field.state.meta.errors} />
                    </Label>
                  )}
                </form.Field>

                <form.Field name="status">
                  {(field) => (
                    <Label className="flex flex-col items-start gap-1">
                      Column
                      <Select
                        value={field.state.value}
                        onValueChange={(value) => value && field.handleChange(value as CardStatus)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANES.find((l) => l.type === type)!.columns.map((c) => (
                            <SelectItem key={c.status} value={c.status}>
                              {c.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                  )}
                </form.Field>
              </div>
            )}
          </form.Subscribe>

          <div className="grid grid-cols-2 gap-3">
            <form.Field name="source">
              {(field) => (
                <Label className="flex flex-col items-start gap-1">
                  Source <span className="font-normal text-muted-foreground">(optional)</span>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Payee or payer"
                  />
                </Label>
              )}
            </form.Field>

            <form.Field name="priority">
              {(field) => (
                <Label className="flex flex-col items-start gap-1">
                  Priority
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => value && field.handleChange(value as CardPriority)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </Label>
              )}
            </form.Field>
          </div>

          <form.Field name="recurring">
            {(field) => (
              <div className="flex flex-col gap-3 rounded-xl border border-border p-3">
                <Label>
                  <Checkbox
                    checked={field.state.value}
                    onCheckedChange={(checked) => {
                      const isRecurring = checked === true
                      field.handleChange(isRecurring)
                      if (isRecurring && !form.getFieldValue('recurrence')) {
                        const seedDate = new Date(fromDateInput(form.getFieldValue('date')))
                        form.setFieldValue('recurrence', {
                          frequency: 'monthly',
                          interval: 1,
                          dayOfMonth: seedDate.getDate(),
                        })
                      }
                    }}
                  />
                  Recurring
                </Label>

                {field.state.value ? (
                  <form.Field name="recurrence">
                    {(recurrenceField) => {
                      const value: Recurrence = recurrenceField.state.value ?? {
                        frequency: 'monthly',
                        interval: 1,
                        dayOfMonth: 1,
                      }
                      return (
                        <div className="grid grid-cols-2 gap-3 pl-6">
                          <Label className="flex flex-col items-start gap-1">
                            Repeats
                            <Select
                              value={value.frequency}
                              onValueChange={(frequency) => {
                                if (!frequency) return
                                const seedDate = new Date(fromDateInput(form.getFieldValue('date')))
                                recurrenceField.handleChange(
                                  frequency === 'weekly'
                                    ? {
                                        frequency: 'weekly',
                                        interval: value.interval,
                                        weekday: seedDate.getDay(),
                                      }
                                    : {
                                        frequency: 'monthly',
                                        interval: value.interval,
                                        dayOfMonth: seedDate.getDate(),
                                      },
                                )
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue>
                                  {(frequency: string) =>
                                    frequency === 'weekly' ? 'Weekly' : 'Monthly'
                                  }
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </Label>

                          <Label className="flex flex-col items-start gap-1">
                            Every
                            <div className="flex w-full items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max={value.frequency === 'weekly' ? 52 : 24}
                                value={value.interval}
                                onChange={(e) =>
                                  recurrenceField.handleChange({
                                    ...value,
                                    interval: Math.max(1, Number(e.target.value) || 1),
                                  })
                                }
                              />
                              <span className="text-xs whitespace-nowrap text-muted-foreground">
                                {value.frequency === 'weekly' ? 'week(s)' : 'month(s)'}
                              </span>
                            </div>
                          </Label>

                          {value.frequency === 'weekly' ? (
                            <Label className="col-span-2 flex flex-col items-start gap-1">
                              On
                              <Select
                                value={String(value.weekday ?? 0)}
                                onValueChange={(weekday) =>
                                  weekday &&
                                  recurrenceField.handleChange({
                                    ...value,
                                    weekday: Number(weekday),
                                  })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue>
                                    {(weekday: string) => WEEKDAYS[Number(weekday)]}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {WEEKDAYS.map((label, index) => (
                                    <SelectItem key={label} value={String(index)}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Label>
                          ) : (
                            <Label className="col-span-2 flex flex-col items-start gap-1">
                              On day
                              <Input
                                type="number"
                                min="1"
                                max="31"
                                value={value.dayOfMonth ?? 1}
                                onChange={(e) =>
                                  recurrenceField.handleChange({
                                    ...value,
                                    dayOfMonth: Math.min(
                                      31,
                                      Math.max(1, Number(e.target.value) || 1),
                                    ),
                                  })
                                }
                              />
                            </Label>
                          )}

                          <p className="col-span-2 text-xs text-muted-foreground">
                            {describeRecurrence(value)}
                          </p>
                        </div>
                      )
                    }}
                  </form.Field>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Saving…' : card ? 'Save changes' : 'Add card'}
                </Button>
              </DialogFooter>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FieldMessage({ errors }: { errors: Array<unknown> }) {
  const message = fieldErrorMessage(errors)
  if (!message) return null
  return <span className="text-xs text-destructive">{message}</span>
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
    recurrence: values.recurring ? (values.recurrence ?? undefined) : undefined,
    source: values.source.trim() || undefined,
    status: values.status,
  }
}
