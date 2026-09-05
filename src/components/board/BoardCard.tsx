import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CopyPlus, GripVertical, Repeat, Trash2 } from 'lucide-react'
import { formatCurrency, relativeDue, urgency } from '#/lib/board'
import type { Card } from '#/lib/board'

const PRIORITY_DOT: Record<Card['priority'], string> = {
  low: 'bg-[var(--sea-ink-soft)]',
  medium: 'bg-[var(--lagoon)]',
  high: 'bg-[#e2725b]',
}

export function CardFace({
  card,
  dragging = false,
  onOpen,
  onDelete,
  onRepeat,
  dragHandleProps,
}: {
  card: Card
  dragging?: boolean
  onOpen?: () => void
  onDelete?: () => void
  onRepeat?: () => void
  dragHandleProps?: Record<string, unknown>
}) {
  const state = urgency(card)

  const accent =
    state === 'overdue'
      ? 'border-[#e2725b] shadow-[0_0_0_1px_rgba(226,114,91,0.35)]'
      : state === 'due-soon'
        ? 'border-[#e0a33e]'
        : 'border-[var(--line)]'

  return (
    <article
      className={`group rounded-2xl border bg-[var(--surface-strong)] p-3 transition ${accent} ${
        dragging
          ? 'rotate-1 shadow-xl'
          : 'hover:-translate-y-0.5 hover:shadow-md'
      } ${state === 'done' ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="Drag card"
          className="mt-0.5 cursor-grab text-[var(--sea-ink-soft)] opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
          {...dragHandleProps}
        >
          <GripVertical size={16} />
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-[var(--sea-ink)]">
              {card.description}
            </span>
            <span
              className={`shrink-0 text-sm font-bold tabular-nums ${
                card.type === 'income'
                  ? 'text-[var(--palm)]'
                  : 'text-[var(--sea-ink)]'
              }`}
            >
              {card.type === 'income' ? '+' : ''}
              {formatCurrency(card.amount)}
            </span>
          </div>

          {card.source ? (
            <p className="mt-0.5 truncate text-xs text-[var(--sea-ink-soft)]">
              {card.source}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 rounded-full border border-[var(--chip-line)] px-2 py-0.5 ${
                state === 'overdue'
                  ? 'bg-[rgba(226,114,91,0.16)] font-semibold text-[#b4462f]'
                  : state === 'due-soon'
                    ? 'bg-[rgba(224,163,62,0.16)] font-semibold text-[#8a6320]'
                    : 'bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]'
              }`}
            >
              {state === 'done' ? 'done' : relativeDue(card.date)}
            </span>

            <span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2 py-0.5 text-[var(--sea-ink-soft)]">
              {card.category}
            </span>

            {card.recurring ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-2 py-0.5 text-[var(--sea-ink-soft)]">
                <Repeat size={11} /> recurring
              </span>
            ) : null}

            <span
              title={`${card.priority} priority`}
              className={`ml-auto h-2 w-2 rounded-full ${PRIORITY_DOT[card.priority]}`}
            />
          </div>
        </button>

        <div className="mt-0.5 flex flex-col gap-1">
          {onRepeat && card.recurring ? (
            <button
              type="button"
              aria-label={`Repeat ${card.description} next month`}
              title="Copy to next month"
              onClick={onRepeat}
              className="text-[var(--sea-ink-soft)] opacity-0 transition hover:text-[var(--lagoon-deep)] group-hover:opacity-100"
            >
              <CopyPlus size={15} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              aria-label={`Delete ${card.description}`}
              onClick={onDelete}
              className="text-[var(--sea-ink-soft)] opacity-0 transition hover:text-[#b4462f] group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default function BoardCard({
  card,
  onOpen,
  onDelete,
  onRepeat,
}: {
  card: Card
  onOpen: () => void
  onDelete: () => void
  onRepeat: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card._id, data: { card } })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <CardFace
        card={card}
        onOpen={onOpen}
        onDelete={onDelete}
        onRepeat={onRepeat}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
