import { Store } from '@tanstack/store'

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'error'
}

export const toasts = new Store<Array<Toast>>([])

let nextId = 1

export function dismissToast(id: number) {
  toasts.setState((list) => list.filter((t) => t.id !== id))
}

export function pushToast(message: string, tone: Toast['tone'] = 'info') {
  const id = nextId++
  toasts.setState((list) => [...list, { id, message, tone }])
  setTimeout(() => dismissToast(id), tone === 'error' ? 6000 : 3000)
  return id
}

/**
 * Runs a mutation and surfaces failures instead of leaving the UI silently
 * out of date. Convex retries transient errors itself, so anything that lands
 * here is worth telling the user about.
 */
export async function withToast<T>(promise: Promise<T>, { error }: { error: string }) {
  try {
    return await promise
  } catch (cause) {
    console.error(error, cause)
    pushToast(error, 'error')
    return undefined
  }
}
