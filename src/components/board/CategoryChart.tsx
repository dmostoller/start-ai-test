import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { DAY, isCompleted, occurrencesInRange } from '#/lib/board'
import type { Card as BoardCard } from '#/lib/board'

const chartConfig = {
  amount: { label: 'Amount', color: 'var(--primary)' },
} satisfies ChartConfig

export default function CategoryChart({
  cards,
  horizonDays,
}: {
  cards: Array<BoardCard>
  horizonDays: number
}) {
  const now = Date.now()
  const horizonEnd = now + horizonDays * DAY

  // A recurring card in an open column counts every future occurrence
  // within the horizon; a completed card is a single, already-realized
  // amount.
  const totals = new Map<string, number>()
  for (const card of cards) {
    if (card.type !== 'expense') continue
    const occurrences = isCompleted(card.status)
      ? 1
      : occurrencesInRange(card, now, horizonEnd).length
    totals.set(card.category, (totals.get(card.category) ?? 0) + card.amount * occurrences)
  }

  const data = Array.from(totals, ([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Spending by category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
