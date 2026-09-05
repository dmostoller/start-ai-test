import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { Pool } from 'pg'

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

export const hasGoogleAuth = Boolean(googleClientId && googleClientSecret)

/**
 * Better Auth needs its own store for users, sessions and OAuth accounts —
 * Convex holds the board, not the credentials. Point `DATABASE_URL` at any
 * Postgres (Neon, Supabase, RDS…) and run `npx @better-auth/cli migrate` once
 * to create the tables.
 *
 * Without it Better Auth falls back to its in-memory adapter, which is fine
 * for a first local run but forgets every account when the server restarts.
 */
const connectionString = process.env.DATABASE_URL

if (!connectionString && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[auth] DATABASE_URL is not set — using the in-memory store. ' +
      'Accounts will disappear when the dev server restarts.',
  )
}

if (!connectionString && process.env.NODE_ENV === 'production') {
  throw new Error(
    'DATABASE_URL is required in production: Better Auth would otherwise ' +
      'keep accounts in memory and lose them on every cold start.',
  )
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  ...(connectionString ? { database: new Pool({ connectionString }) } : {}),
  emailAndPassword: {
    // Kept enabled so the app is usable before Google OAuth credentials exist.
    enabled: true,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : undefined,
  plugins: [tanstackStartCookies()],
})
