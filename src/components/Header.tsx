import { Link } from '@tanstack/react-router'
import { Wallet } from 'lucide-react'
import BetterAuthHeader from '../integrations/better-auth/header-user'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-6xl items-center gap-3 py-3">
        <Link
          to="/"
          className="group flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <Wallet size={16} strokeWidth={2.25} />
          </span>
          <span className="text-base font-semibold tracking-tight text-foreground">
            Budget Board
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <BetterAuthHeader />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
