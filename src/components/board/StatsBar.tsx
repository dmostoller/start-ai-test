import { AlertTriangle, Clock, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { formatCurrency } from '#/lib/board'

export interface BoardStats {
  upcomingExpenses: number
  expectedIncome: number
  net: number
  overdueCount: number
  overdueAmount: number
  dueSoonCount: number
  dueSoonAmount: number
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  tone?: 'neutral' | 'good' | 'bad' | 'warn'
}) {
  const toneClass = {
    neutral: 'text-[var(--sea-ink)]',
    good: 'text-[var(--palm)]',
    bad: 'text-[#b4462f]',
    warn: 'text-[#8a6320]',
  }[tone]

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
      <span className={`shrink-0 ${toneClass}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-[var(--sea-ink-soft)]">{label}</p>
        <p className={`text-base font-bold tabular-nums ${toneClass}`}>{value}</p>
        {sub ? <p className="text-[11px] text-[var(--sea-ink-soft)]">{sub}</p> : null}
      </div>
    </div>
  )
}

export default function StatsBar({
  stats,
  horizonDays,
}: {
  stats: BoardStats | undefined
  horizonDays: number
}) {
  if (!stats) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[70px] animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Stat
        icon={<TrendingUp size={20} />}
        label="Expected income"
        value={formatCurrency(stats.expectedIncome)}
        sub={`next ${horizonDays} days`}
        tone="good"
      />
      <Stat
        icon={<TrendingDown size={20} />}
        label="Upcoming expenses"
        value={formatCurrency(stats.upcomingExpenses)}
        sub={`next ${horizonDays} days`}
      />
      <Stat
        icon={<Wallet size={20} />}
        label="Net balance"
        value={formatCurrency(stats.net)}
        sub="income − expenses"
        tone={stats.net >= 0 ? 'good' : 'bad'}
      />
      <Stat
        icon={<AlertTriangle size={20} />}
        label="Overdue"
        value={String(stats.overdueCount)}
        sub={formatCurrency(stats.overdueAmount)}
        tone={stats.overdueCount > 0 ? 'bad' : 'neutral'}
      />
      <Stat
        icon={<Clock size={20} />}
        label="Due this week"
        value={String(stats.dueSoonCount)}
        sub={formatCurrency(stats.dueSoonAmount)}
        tone={stats.dueSoonCount > 0 ? 'warn' : 'neutral'}
      />
    </div>
  )
}
