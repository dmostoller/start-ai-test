import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { authClient } from '#/lib/auth-client'
import { hasGoogleAuth } from '#/lib/auth'
import { useUserId } from '#/lib/user'

const getAuthProviders = createServerFn({ method: 'GET' }).handler(() => ({
  google: hasGoogleAuth,
}))

export const Route = createFileRoute('/signin')({
  component: SignIn,
  loader: () => getAuthProviders(),
})

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters'),
  name: z.string(),
})

function SignIn() {
  const { google } = Route.useLoaderData()
  const router = useRouter()
  const { userId } = useUserId()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '', password: '', name: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setError(null)
      const result =
        mode === 'signin'
          ? await authClient.signIn.email({
              email: value.email,
              password: value.password,
            })
          : await authClient.signUp.email({
              email: value.email,
              password: value.password,
              name: value.name || value.email.split('@')[0],
            })

      if (result.error) {
        setError(result.error.message ?? 'Something went wrong')
        return
      }
      await router.navigate({ to: '/' })
    },
  })

  if (userId) {
    return (
      <main className="ui-page ui-center">
        <p className="text-sm text-[var(--sea-ink-soft)]">
          You’re signed in.{' '}
          <a href="/" className="font-semibold text-[var(--lagoon-deep)]">
            Go to your board
          </a>
        </p>
      </main>
    )
  }

  return (
    <main className="ui-page">
      <div className="ui-card mx-auto max-w-md p-6">
        <h1 className="ui-title mb-1 text-xl font-semibold">
          {mode === 'signin' ? 'Sign in' : 'Create an account'}
        </h1>
        <p className="ui-muted mb-5 text-sm">
          Budget Board keeps a separate board for every account.
        </p>

        {google ? (
          <>
            <button
              type="button"
              onClick={() =>
                void authClient.signIn.social({
                  provider: 'google',
                  callbackURL: '/',
                })
              }
              className="ui-button w-full justify-center px-4 py-2.5"
            >
              Continue with Google
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-[var(--sea-ink-soft)]">
              <span className="h-px flex-1 bg-[var(--line)]" />
              or
              <span className="h-px flex-1 bg-[var(--line)]" />
            </div>
          </>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
          className="flex flex-col gap-3"
        >
          {mode === 'signup' ? (
            <form.Field name="name">
              {(field) => (
                <input
                  className="ui-input"
                  placeholder="Name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </form.Field>
          ) : null}

          <form.Field name="email">
            {(field) => (
              <input
                className="ui-input"
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <input
                className="ui-input"
                type="password"
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                placeholder="Password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            )}
          </form.Field>

          {error ? (
            <p className="ui-alert ui-alert-danger text-sm">{error}</p>
          ) : null}

          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <button
                type="submit"
                disabled={isSubmitting}
                className="ui-button justify-center px-4 py-2.5"
              >
                {isSubmitting
                  ? 'Working…'
                  : mode === 'signin'
                    ? 'Sign in'
                    : 'Create account'}
              </button>
            )}
          </form.Subscribe>
        </form>

        <button
          type="button"
          onClick={() => {
            setError(null)
            setMode(mode === 'signin' ? 'signup' : 'signin')
          }}
          className="mt-4 w-full text-center text-sm text-[var(--lagoon-deep)]"
        >
          {mode === 'signin'
            ? 'Need an account? Sign up'
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  )
}
