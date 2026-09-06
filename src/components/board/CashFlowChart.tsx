import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import { DAY, formatCurrency, formatDate, toDateInput } from '#/lib/board'
import type { Card as BoardCard } from '#/lib/board'

const chartConfig = {
  balance: { label: 'Projected balance', color: 'var(--primary)' },
} satisfies ChartConfig

export default function CashFlowChart({
  cards,
  horizonDays,
}: {
  cards: Array<BoardCard>
  horizonDays: number
}) {
  const netByDay = new Map<string, number>()
  for (const card of cards) {
    const key = toDateInput(card.date)
    const net = card.type === 'income' ? card.amount : -card.amount
    netByDay.set(key, (netByDay.get(key) ?? 0) + net)
  }

  const start = new Date()
  start.setHours(0, 0, 0, 0)

  let balance = 0
  const data = Array.from({ length: horizonDays + 1 }, (_, i) => {
    const date = start.getTime() + i * DAY
    balance += netByDay.get(toDateInput(date)) ?? 0
    return { label: formatDate(date), balance }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Cash flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="cash-flow-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-balance)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-balance)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={40}
            />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
            />
            <Area
              dataKey="balance"
              type="monotone"
              fill="url(#cash-flow-fill)"
              stroke="var(--color-balance)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
