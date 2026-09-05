import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useMutation, useQuery } from 'convex/react'
import { Bot, Plus } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import Column from './Column'
import StatsBar from './StatsBar'
import AISidebar from './AISidebar'
import CardDialog, { toCardMutationArgs } from './CardDialog'
import { CardFace } from './BoardCard'
import { DAY, HORIZON_OPTIONS, LANES, isCompleted } from '#/lib/board'
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
      return
    }

    const column = (byStatus.get(targetStatus) ?? []).filter(
      (c) => c._id !== card._id,
    )
    const overCard = over.data.current?.card as Card | undefined
    const index = overCard
      ? column.findIndex((c) => c._id === overCard._id)
      : column.length

    const after = index > 0 ? column[index - 1] : undefined
    const before =
      index >= 0 && index < column.length ? column[index] : undefined

    if (
      card.status === targetStatus &&
      before?._id === card._id &&
      after === undefined
    ) {
      return
    }

    await moveCard({
      userId,
      id: card._id as Id<'cards'>,
      status: targetStatus,
      afterOrder: after?.order,
      beforeOrder: before?.order,
    })
  }

  async function submitCard(values: CardFormValues) {
    const args = toCardMutationArgs(values)
    if (draft?.card) {
      await updateCard({ userId, id: draft.card._id as Id<'cards'>, ...args })
    } else {
      await createCard({ userId, ...args })
    }
  }

  return (
    <div className="ui-page-wide mx-auto px-4 pb-16 pt-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="island-kicker">Budget Board</p>
          <h1 className="display-title text-2xl font-bold text-[var(--sea-ink)] sm:text-3xl">
            Your cash flow, one card at a time
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-[var(--sea-ink-soft)]">
            Horizon
            <select
              className="ui-select ui-input-fit"
              value={horizonDays}
              onChange={(e) =>
                void saveSettings({
                  userId,
                  horizonDays: Number(e.target.value),
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

          <label className="flex items-center gap-2 text-xs text-[var(--sea-ink-soft)]">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) =>
                void saveSettings({ userId, showCompleted: e.target.checked })
              }
            />
            Show completed
          </label>

          <button
            type="button"
            onClick={() => setDraft({ status: 'upcoming' })}
            className="ui-button px-3 py-2 text-sm"
          >
            <Plus size={16} /> New card
          </button>

          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="ui-button ui-button-secondary px-3 py-2 text-sm"
          >
            <Bot size={16} /> Ask AI
          </button>
        </div>
      </div>

      <div className="mb-6">
        <StatsBar stats={stats} horizonDays={horizonDays} />
      </div>

      {cards === undefined ? (
        <p className="ui-muted text-sm">Loading your board…</p>
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
                <h2 className="ui-section-title mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)]">
                  {lane.title}
                </h2>
                <div
                  className={`grid gap-3 ${
                    lane.columns.length === 3
                      ? 'md:grid-cols-3'
                      : 'md:grid-cols-2'
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
                          void removeCard({
                            userId,
                            id: card._id as Id<'cards'>,
                          })
                        }
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <DragOverlay>
            {activeCard ? <CardFace card={activeCard} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {draft && categories ? (
        <CardDialog
          draft={draft}
          categories={categories}
          onClose={() => setDraft(null)}
          onSubmit={submitCard}
          onAddCategory={(name: string, type: CardType) =>
            addCategory({ userId, name, type })
          }
        />
      ) : null}

      <AISidebar open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  )
}
