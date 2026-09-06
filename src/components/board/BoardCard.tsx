import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CopyPlus, GripVertical, Repeat, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency, relativeDue, urgency } from '#/lib/board'
import type { Card } from '#/lib/board'

const PRIORITY_DOT: Record<Card['priority'], string> = {
  low: 'bg-muted-foreground',
  medium: 'bg-primary',
  high: 'bg-destructive',
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
      ? 'border-destructive ring-1 ring-destructive/30'
      : state === 'due-soon'
        ? 'border-amber-500/70'
        : 'border-border'

  return (
    <article
      className={cn(
        'group rounded-2xl border bg-card p-3 text-card-foreground transition',
        accent,
        dragging ? 'rotate-1 shadow-xl' : 'hover:-translate-y-0.5 hover:shadow-md',
        state === 'done' ? 'opacity-70' : '',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="Drag card"
          className="mt-0.5 cursor-grab text-muted-foreground opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
          {...dragHandleProps}
        >
          <GripVertical size={16} />
        </button>

        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {card.description}
            </span>
            <span
              className={cn(
                'shrink-0 text-sm font-bold tabular-nums',
                card.type === 'income'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-foreground',
              )}
            >
              {card.type === 'income' ? '+' : ''}
              {formatCurrency(card.amount)}
            </span>
          </div>

          {card.source ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{card.source}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <Badge
              variant={state === 'overdue' ? 'destructive' : 'outline'}
              className={
                state === 'due-soon'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : undefined
              }
            >
              {state === 'done' ? 'done' : relativeDue(card.date)}
            </Badge>

            <Badge variant="outline">{card.category}</Badge>

            {card.recurring ? (
              <Badge variant="outline">
                <Repeat size={11} /> recurring
              </Badge>
            ) : null}

            <span
              title={`${card.priority} priority`}
              className={cn('ml-auto h-2 w-2 rounded-full', PRIORITY_DOT[card.priority])}
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
              className="text-muted-foreground opacity-0 transition hover:text-primary group-hover:opacity-100"
            >
              <CopyPlus size={15} />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              aria-label={`Delete ${card.description}`}
              onClick={onDelete}
              className="text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card._id,
    data: { card },
  })

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
