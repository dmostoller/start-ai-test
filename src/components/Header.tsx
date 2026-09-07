import { Link } from '@tanstack/react-router'
import BetterAuthHeader from '../integrations/better-auth/header-user'
import ThemeToggle from './ThemeToggle'
import { FolderKanban } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-6xl items-center gap-3 py-3">
        <Link
          to="/"
          className="group flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <FolderKanban className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-foreground" />
          <span className="text-lg font-semibold tracking-tight text-foreground">Budget Board</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <BetterAuthHeader />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
