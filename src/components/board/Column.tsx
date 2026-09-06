import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import BoardCard from './BoardCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
      className={cn(
        'flex min-h-[12rem] w-full flex-col rounded-2xl border p-3 transition',
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/40',
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          <Badge variant="secondary">{cards.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {formatCurrency(total)}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onAdd}
            aria-label={`Add card to ${title}`}
          >
            <Plus />
          </Button>
        </div>
      </header>

      <SortableContext items={cards.map((c) => c._id)} strategy={verticalListSortingStrategy}>
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
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              Drop cards here
            </p>
          ) : null}
        </div>
      </SortableContext>
    </section>
  )
}
