import { ConvexHttpClient } from 'convex/browser'

/**
 * Convex client for server-side code (AI tools, server routes).
 * `VITE_CONVEX_URL` is the same deployment the browser client talks to, so
 * writes made here stream straight back into the board's live queries.
 */
export function getConvexServerClient() {
  const url = process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL
  if (!url) {
    throw new Error('Missing VITE_CONVEX_URL — set it in .env.local (see .env.example)')
  }
  return new ConvexHttpClient(url)
}
