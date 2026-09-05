import { createFileRoute } from '@tanstack/react-router'
import Board from '#/components/board/Board'
import SignedOutHero from '#/components/SignedOutHero'
import { useUserId } from '#/lib/user'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { userId, isPending } = useUserId()

  if (isPending) {
    return (
      <main className="ui-page">
        <p className="ui-muted text-sm">Loading…</p>
      </main>
    )
  }

  if (!userId) {
    return <SignedOutHero />
  }

  return (
    <main>
      <Board userId={userId} />
    </main>
  )
}
