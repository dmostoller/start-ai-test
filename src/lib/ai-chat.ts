import {
  createChatClientOptions,
  fetchServerSentEvents,
  localStoragePersistence,
  useChat,
} from '@tanstack/ai-react'
import type { InferChatMessages } from '@tanstack/ai-react'

/**
 * One persistent thread per browser: the transcript survives reloads and
 * dropped connections, so a half-finished "add my rent" never gets lost.
 */
const chatOptions = createChatClientOptions({
  connection: fetchServerSentEvents('/api/ai/chat'),
  persistence: localStoragePersistence(),
  threadId: 'budget-board',
})

export type ChatMessages = InferChatMessages<typeof chatOptions>

export const useBoardChat = () => useChat(chatOptions)
