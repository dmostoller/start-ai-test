import { useStore } from '@tanstack/react-store'
import { AlertCircle, Check, X } from 'lucide-react'
import { dismissToast, toasts } from '#/lib/toast'

export default function Toaster() {
  const list = useStore(toasts, (state) => state)

  if (list.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[200] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2">
      {list.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur-xl ${
            toast.tone === 'error'
              ? 'border-[rgba(226,114,91,0.5)] bg-[rgba(226,114,91,0.16)] text-[#b4462f]'
              : 'border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink)]'
          }`}
        >
          {toast.tone === 'error' ? (
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <Check size={16} className="mt-0.5 shrink-0" />
          )}
          <p className="flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss"
            className="mt-0.5 shrink-0 opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
