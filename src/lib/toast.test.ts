import { beforeEach, describe, expect, test, vi } from 'vitest'
import { dismissToast, pushToast, toasts, withToast } from './toast'

beforeEach(() => {
  toasts.setState(() => [])
  vi.useRealTimers()
})

describe('toasts', () => {
  test('queues and dismisses by id', () => {
    const id = pushToast('Saved')
    expect(toasts.state).toHaveLength(1)
    dismissToast(id)
    expect(toasts.state).toHaveLength(0)
  })

  test('expires on its own', () => {
    vi.useFakeTimers()
    pushToast('Saved')
    vi.advanceTimersByTime(3000)
    expect(toasts.state).toHaveLength(0)
  })

  test('passes a successful mutation through untouched', async () => {
    await expect(
      withToast(Promise.resolve('ok'), { error: 'Nope' }),
    ).resolves.toBe('ok')
    expect(toasts.state).toHaveLength(0)
  })

  test('surfaces a failed mutation as an error toast', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await withToast(Promise.reject(new Error('boom')), {
      error: 'Could not save the card',
    })

    expect(result).toBeUndefined()
    expect(toasts.state).toMatchObject([
      { message: 'Could not save the card', tone: 'error' },
    ])
  })
})
