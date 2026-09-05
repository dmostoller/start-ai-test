import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles, X } from 'lucide-react'
import { Streamdown } from 'streamdown'
import { useBoardChat } from '#/lib/ai-chat'
import type { ChatMessages } from '#/lib/ai-chat'

const SUGGESTIONS = [
  'Rent $1200 due on the 15th',
  'Netflix $15 monthly subscription',
  'Getting paid $2400 next Friday',
  'How much do I owe this week?',
]

function ToolLine({ name, summary }: { name: string; summary?: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-[var(--sea-ink-soft)]">
      <Sparkles size={12} className="text-[var(--lagoon)]" />
      <span className="font-medium">{summary ?? name}</span>
    </p>
  )
}

function Messages({ messages }: { messages: ChatMessages }) {
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [messages])

  if (!messages.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <Bot size={28} className="text-[var(--lagoon)]" />
        <p className="text-sm font-semibold text-[var(--sea-ink)]">
          Describe your money in plain English
        </p>
        <p className="text-xs text-[var(--sea-ink-soft)]">
          I'll create, move and update cards on the board for you.
        </p>
      </div>
    )
  }

  return (
    <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
      {messages.map(({ id, role, parts }) => (
        <div
          key={id}
          className={`rounded-2xl px-3 py-2 text-sm ${
            role === 'assistant'
              ? 'bg-[var(--chip-bg)] text-[var(--sea-ink)]'
              : 'ml-auto max-w-[85%] bg-[rgba(79,184,178,0.18)] text-[var(--sea-ink)]'
          }`}
        >
          {parts.map((part, index) => {
            if (part.type === 'text' && part.content) {
              return (
                <div key={index} className="prose-sm max-w-none">
                  <Streamdown>{part.content}</Streamdown>
                </div>
              )
            }
            if (part.type === 'tool-call') {
              const output = part.output as { summary?: string } | undefined
              return (
                <ToolLine
                  key={index}
                  name={part.name}
                  summary={output?.summary}
                />
              )
            }
            return null
          })}
        </div>
      ))}
    </div>
  )
}

export default function AISidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { messages, sendMessage, status } = useBoardChat()
  const [input, setInput] = useState('')

  const busy = status === 'streaming' || status === 'submitted'

  const submit = (text: string) => {
    const value = text.trim()
    if (!value || busy) return
    sendMessage(value)
    setInput('')
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        role="presentation"
      />
      <aside className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-[420px] flex-col border-l border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl backdrop-blur-xl">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            <Bot size={18} className="text-[var(--lagoon)]" />
            Budget assistant
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="rounded-lg p-1 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
          >
            <X size={18} />
          </button>
        </header>

        <Messages messages={messages} />

        {messages.length === 0 ? (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-xs text-[var(--sea-ink-soft)] transition hover:text-[var(--sea-ink)]"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(input)
          }}
          className="border-t border-[var(--line)] p-3"
        >
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                busy ? 'Thinking…' : 'Add an expense, ask a question…'
              }
              rows={1}
              className="ui-textarea pr-10 text-sm"
              style={{ minHeight: '40px', maxHeight: '140px' }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 140)}px`
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit(input)
                }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Send"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--lagoon-deep)] transition disabled:text-[var(--sea-ink-soft)]"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </aside>
    </>
  )
}
