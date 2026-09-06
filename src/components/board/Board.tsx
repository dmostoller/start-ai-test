import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useMutation, useQuery } from 'convex/react'
import { Bot, CheckCheck, Plus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import Column from './Column'
import StatsBar from './StatsBar'
import CategoryChart from './CategoryChart'
import CashFlowChart from './CashFlowChart'
import AISidebar from './AISidebar'
import NotificationsBell from './NotificationsBell'
import CardDialog, { toCardMutationArgs } from './CardDialog'
import { CardFace } from './BoardCard'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DAY, HORIZON_OPTIONS, LANES, isCompleted } from '#/lib/board'
import { pushToast, withToast } from '#/lib/toast'
import type { Card, CardStatus, CardType } from '#/lib/board'
import type { CardDraft, CardFormValues } from './CardDialog'
import type { Id } from '../../../convex/_generated/dataModel'

export default function Board({ userId }: { userId: string }) {
  const cards = useQuery(api.cards.list, { userId }) as Array<Card> | undefined
  const settings = useQuery(api.settings.get, { userId })
  const categories = useQuery(api.categories.list, { userId })
  const stats = useQuery(api.cards.stats, {
    userId,
    horizonDays: settings?.horizonDays ?? 30,
  })

  const createCard = useMutation(api.cards.create)
  const updateCard = useMutation(api.cards.update)
  const moveCard = useMutation(api.cards.move)
  const removeCard = useMutation(api.cards.remove)
  const repeatCard = useMutation(api.cards.repeat)
  const addCategory = useMutation(api.categories.add)
  const saveSettings = useMutation(api.settings.set)

  const [draft, setDraft] = useState<CardDraft | null>(null)
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)

  const horizonDays = settings?.horizonDays ?? 30
  const showCompleted = settings?.showCompleted ?? true

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    // Cards can also be picked up and moved with the keyboard.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const visible = useMemo(() => {
    if (!cards) return []
    const horizon = Date.now() + horizonDays * DAY
    return cards.filter((card) => {
      if (!showCompleted && isCompleted(card.status)) return false
      // Completed cards stay visible regardless of horizon so a just-paid bill
      // does not vanish from under the cursor.
      return card.date <= horizon || isCompleted(card.status)
    })
  }, [cards, horizonDays, showCompleted])

  const byStatus = useMemo(() => {
    const map = new Map<CardStatus, Array<Card>>()
    for (const lane of LANES) {
      for (const column of lane.columns) map.set(column.status, [])
    }
    for (const card of visible) map.get(card.status)?.push(card)
    for (const list of map.values()) list.sort((a, b) => a.order - b.order)
    return map
  }, [visible])

  function onDragStart(event: DragStartEvent) {
    setActiveCard((event.active.data.current?.card as Card | undefined) ?? null)
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveCard(null)
    if (!over) return

    const card = active.data.current?.card as Card | undefined
    if (!card) return

    const overId = String(over.id)
    const targetStatus = overId.startsWith('column:')
      ? (overId.slice('column:'.length) as CardStatus)
      : ((over.data.current?.card as Card | undefined)?.status ?? card.status)

    const lane = LANES.find((l) => l.type === card.type)!
    if (!lane.columns.some((c) => c.status === targetStatus)) {
      // Income cards cannot land in expense columns and vice versa.
      pushToast(`A ${card.type} card can only move between its own columns`, 'error')
      return
    }

    const column = (byStatus.get(targetStatus) ?? []).filter((c) => c._id !== card._id)
    const overCard = over.data.current?.card as Card | undefined
    const index = overCard ? column.findIndex((c) => c._id === overCard._id) : column.length

    const after = index > 0 ? column[index - 1] : undefined
    const before = index >= 0 && index < column.length ? column[index] : undefined

    if (card.status === targetStatus && before?._id === card._id && after === undefined) {
      return
    }

    await withToast(
      moveCard({
        userId,
        id: card._id as Id<'cards'>,
        status: targetStatus,
        afterOrder: after?.order,
        beforeOrder: before?.order,
      }),
      { error: `Could not move "${card.description}"` },
    )
  }

  async function submitCard(values: CardFormValues) {
    const args = toCardMutationArgs(values)
    if (draft?.card) {
      await withToast(updateCard({ userId, id: draft.card._id as Id<'cards'>, ...args }), {
        error: 'Could not save your changes',
      })
    } else {
      await withToast(createCard({ userId, ...args }), {
        error: 'Could not create the card',
      })
    }
  }

  const boardIsEmpty = cards !== undefined && cards.length === 0

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-16">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Budget Board
          </p>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Your cash flow, one card at a time
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs text-muted-foreground">
            Horizon
            <Select
              value={String(horizonDays)}
              onValueChange={(value) =>
                value &&
                void withToast(saveSettings({ userId, horizonDays: Number(value) }), {
                  error: 'Could not save your horizon',
                })
              }
            >
              <SelectTrigger size="sm">
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

          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  size="sm"
                  pressed={showCompleted}
                  onPressedChange={(pressed) =>
                    void withToast(saveSettings({ userId, showCompleted: pressed }), {
                      error: 'Could not save that setting',
                    })
                  }
                  aria-label={showCompleted ? 'Hide completed' : 'Show completed'}
                />
              }
            >
              <CheckCheck />
            </TooltipTrigger>
            <TooltipContent>{showCompleted ? 'Hide completed' : 'Show completed'}</TooltipContent>
          </Tooltip>

          <NotificationsBell
            cards={cards ?? []}
            onOpenCard={(cardId) => {
              const card = cards?.find((c) => c._id === cardId)
              if (card) setDraft({ card, status: card.status })
            }}
          />

          <Button size="sm" onClick={() => setDraft({ status: 'upcoming' })}>
            <Plus size={16} /> New card
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setAssistantOpen(true)}>
            <Bot size={16} /> Ask AI
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <StatsBar stats={stats} horizonDays={horizonDays} />
      </div>

      {!boardIsEmpty ? (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <CashFlowChart cards={visible} horizonDays={horizonDays} />
          <CategoryChart cards={visible} />
        </div>
      ) : null}

      {boardIsEmpty ? (
        <div className="mb-6 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
          <h2 className="text-base font-semibold text-foreground">Your board is empty</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Tell the assistant something like “rent $1200 due on the 15th” and it will fill the
            board in for you — or add the first card yourself.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" onClick={() => setAssistantOpen(true)}>
              <Bot size={16} /> Ask the assistant
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDraft({ status: 'upcoming' })}>
              <Plus size={16} /> Add a card
            </Button>
          </div>
        </div>
      ) : null}

      {cards === undefined ? (
        <p className="text-sm text-muted-foreground">Loading your board…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveCard(null)}
        >
          <div className="flex flex-col gap-6">
            {LANES.map((lane) => (
              <section key={lane.type}>
                <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  {lane.title}
                </h2>
                <div
                  className={`grid gap-3 ${
                    lane.columns.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'
                  }`}
                >
                  {lane.columns.map((column) => (
                    <Column
                      key={column.status}
                      status={column.status}
                      title={column.title}
                      cards={byStatus.get(column.status) ?? []}
                      onAdd={() => setDraft({ status: column.status })}
                      onOpen={(card) => setDraft({ card, status: card.status })}
                      onDelete={(card) => {
                        if (window.confirm(`Delete "${card.description}"?`)) {
                          void withToast(
                            removeCard({
                              userId,
                              id: card._id as Id<'cards'>,
                            }),
                            { error: 'Could not delete that card' },
                          )
                        }
                      }}
                      onRepeat={(card) => {
                        void withToast(
                          repeatCard({
                            userId,
                            id: card._id as Id<'cards'>,
                          }).then(() => pushToast(`Copied "${card.description}" forward`)),
                          { error: 'Could not repeat that card' },
                        )
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <DragOverlay>{activeCard ? <CardFace card={activeCard} dragging /> : null}</DragOverlay>
        </DndContext>
      )}

      {draft && categories ? (
        <CardDialog
          draft={draft}
          categories={categories}
          onClose={() => setDraft(null)}
          onSubmit={submitCard}
          onAddCategory={(name: string, type: CardType) => addCategory({ userId, name, type })}
        />
      ) : null}

      <AISidebar open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  )
}
