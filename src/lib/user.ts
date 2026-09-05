import { authClient } from './auth-client'

/**
 * The signed-in user's id, or `null` while loading / signed out.
 * Every Convex query and mutation in the app is scoped by it.
 */
export function useUserId() {
  const { data: session, isPending } = authClient.useSession()
  return { userId: session?.user.id ?? null, isPending, user: session?.user }
}
