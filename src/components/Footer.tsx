export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-[var(--line)] px-4 pb-10 pt-8 text-[var(--sea-ink-soft)]">
      <div className="ui-page-wide mx-auto flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">&copy; {year} Budget Board</p>
        <p className="island-kicker m-0">Built with TanStack Start, Convex and TanStack AI</p>
      </div>
    </footer>
  )
}
