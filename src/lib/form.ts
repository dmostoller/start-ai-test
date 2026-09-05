/**
 * TanStack Form surfaces validator errors as unknown values: Zod issues are
 * objects with a `message`, a custom validator may return a bare string. This
 * narrows either shape down to something safe to render.
 */
export function fieldErrorMessage(errors: Array<unknown>): string | null {
  const first = errors[0]
  if (!first) return null
  if (typeof first === 'string') return first
  if (typeof first === 'object' && 'message' in first && typeof first.message === 'string') {
    return first.message
  }
  return null
}
