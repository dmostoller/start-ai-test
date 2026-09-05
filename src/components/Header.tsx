import { Link } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'
import BetterAuthHeader from '../integrations/better-auth/header-user'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="ui-page-wide mx-auto flex items-center gap-3 py-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] no-underline sm:px-4 sm:py-2"
        >
          <Wallet size={16} className="text-[var(--lagoon-deep)]" />
          Budget Board
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <BetterAuthHeader />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
