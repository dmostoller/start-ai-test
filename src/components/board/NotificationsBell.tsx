import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, CalendarClock, Check, Clock } from 'lucide-react'
import {
  buildAlerts,
  pruneDismissed,
  readDismissed,
  writeDismissed,
} from '#/lib/notifications'
import type { Alert, AlertKind } from '#/lib/notifications'
import type { Card } from '#/lib/board'

const ICON: Record<AlertKind, React.ReactNode> = {
  overdue: <AlertTriangle size={15} className="text-[#b4462f]" />,
  'due-today': <Clock size={15} className="text-[#8a6320]" />,
  'due-soon': <CalendarClock size={15} className="text-[var(--lagoon-deep)]" />,
  'income-late': <Clock size={15} className="text-[var(--sea-ink-soft)]" />,
}

export default function NotificationsBell({
  cards,
  onOpenCard,
}: {
  cards: Array<Card>
  onOpenCard: (cardId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<Array<string>>([])

  // Read on mount rather than during render: localStorage does not exist while
  // the page is being server-rendered.
  useEffect(() => setDismissed(readDismissed()), [])

  const alerts = useMemo(() => buildAlerts(cards), [cards])
  const visible = alerts.filter((a) => !dismissed.includes(a.id))

  function dismiss(alert: Alert) {
    const next = pruneDismissed([...dismissed, alert.id], alerts)
    setDismissed(next)
    writeDismissed(next)
  }

  function dismissAll() {
    const next = visible.map((a) => a.id).concat(dismissed)
    const pruned = pruneDismissed(next, alerts)
    setDismissed(pruned)
    writeDismissed(pruned)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications (${visible.length})`}
        aria-expanded={open}
        className="relative rounded-xl p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
      >
        <Bell size={18} />
        {visible.length > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e2725b] px-1 text-[10px] font-bold text-white">
            {visible.length > 9 ? '9+' : visible.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-[95]"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div className="absolute right-0 z-[96] mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-xl backdrop-blur-xl">
            <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
              <h2 className="text-sm font-semibold text-[var(--sea-ink)]">
                Reminders
              </h2>
              {visible.length > 0 ? (
                <button
                  type="button"
                  onClick={dismissAll}
                  className="text-xs text-[var(--lagoon-deep)]"
                >
                  Clear all
                </button>
              ) : null}
            </header>

            {visible.length === 0 ? (
              <p className="flex items-center gap-2 px-4 py-6 text-sm text-[var(--sea-ink-soft)]">
                <Check size={16} className="text-[var(--palm)]" />
                Nothing needs your attention.
              </p>
            ) : (
              <ul className="max-h-[60vh] overflow-y-auto">
                {visible.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-start gap-2 border-b border-[var(--line)] px-4 py-3 last:border-0"
                  >
                    <span className="mt-0.5">{ICON[alert.kind]}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCard(alert.cardId)
                        setOpen(false)
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-[var(--sea-ink)]">
                        {alert.title}
                      </p>
                      <p className="text-xs text-[var(--sea-ink-soft)]">
                        {alert.detail}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => dismiss(alert)}
                      aria-label={`Dismiss ${alert.title}`}
                      className="mt-0.5 text-xs text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                    >
                      <Check size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
