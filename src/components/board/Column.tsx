import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import BoardCard from './BoardCard'
import { formatCurrency } from '#/lib/board'
import type { Card, CardStatus } from '#/lib/board'

export default function Column({
  status,
  title,
  cards,
  onAdd,
  onOpen,
  onDelete,
  onRepeat,
}: {
  status: CardStatus
  title: string
  cards: Array<Card>
  onAdd: () => void
  onOpen: (card: Card) => void
  onDelete: (card: Card) => void
  onRepeat: (card: Card) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${status}`,
    data: { status },
  })

  const total = cards.reduce((sum, c) => sum + c.amount, 0)

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[12rem] w-full flex-col rounded-2xl border p-3 transition ${
        isOver
          ? 'border-[var(--lagoon)] bg-[rgba(79,184,178,0.1)]'
          : 'border-[var(--line)] bg-[var(--surface)]'
      }`}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--sea-ink)]">
            {title}
          </h3>
          <span className="rounded-full bg-[var(--chip-bg)] px-2 py-0.5 text-[11px] text-[var(--sea-ink-soft)]">
            {cards.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums text-[var(--sea-ink-soft)]">
            {formatCurrency(total)}
          </span>
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add card to ${title}`}
            className="rounded-lg p-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
          >
            <Plus size={16} />
          </button>
        </div>
      </header>

      <SortableContext
        items={cards.map((c) => c._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2">
          {cards.map((card) => (
            <BoardCard
              key={card._id}
              card={card}
              onOpen={() => onOpen(card)}
              onDelete={() => onDelete(card)}
              onRepeat={() => onRepeat(card)}
            />
          ))}
          {cards.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-xs text-[var(--sea-ink-soft)]">
              Drop cards here
            </p>
          ) : null}
        </div>
      </SortableContext>
    </section>
  )
}
