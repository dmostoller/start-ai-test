import { Markdown } from '@tanstack/markdown/react'
import { defaultHighlighter } from '@tanstack/highlight'
import { createTanStackMarkdownHighlighter } from '@tanstack/highlight/markdown'
import { cn } from '@/lib/utils'

const highlighter = createTanStackMarkdownHighlighter(defaultHighlighter)

export function MarkdownContent({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <Markdown highlighter={highlighter}>{children}</Markdown>
    </div>
  )
}
