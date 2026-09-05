import { Link } from '@tanstack/react-router'
import { Bot, LayoutGrid, Zap } from 'lucide-react'

const FEATURES = [
  {
    icon: <Bot size={20} />,
    title: 'Talk, don’t type forms',
    body: '“Rent $1200 due on the 15th” becomes a card, categorised and dated.',
  },
  {
    icon: <LayoutGrid size={20} />,
    title: 'Two swimlanes, five columns',
    body: 'Expenses move upcoming → due → paid. Income moves expected → received.',
  },
  {
    icon: <Zap size={20} />,
    title: 'Live everywhere',
    body: 'Convex keeps every open tab in sync the instant a card changes.',
  },
]

export default function SignedOutHero() {
  return (
    <main className="ui-page">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-12 sm:px-10">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,var(--hero-a),transparent_66%)]" />
        <p className="island-kicker mb-3">Budget Board</p>
        <h1 className="display-title mb-4 max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          A kanban board for the money coming and going.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Describe a bill or a paycheck in plain English and the assistant puts
          it on the board. Drag a card to mark it paid.
        </p>
        <Link to="/signin" className="ui-button px-5 py-2.5">
          Sign in to get started
        </Link>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="feature-card p-5">
            <span className="text-[var(--lagoon-deep)]">{feature.icon}</span>
            <h2 className="mt-3 text-base font-semibold text-[var(--sea-ink)]">
              {feature.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}
