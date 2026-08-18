import { vi } from 'vitest'
import type { LanguageModelAPI, LanguageModelAvailability, LanguageModelSession } from '../language-model.js'
import { LocalChat } from '../local-chat.js'

export function mount(): LocalChat {
  const chat = document.createElement(LocalChat.tagName) as LocalChat
  document.body.appendChild(chat)
  return chat
}

export function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

export function expandWidget(chat: LocalChat): void {
  chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')?.click()
}

export function collapseWidget(chat: LocalChat): void {
  chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="panel-close"]')?.click()
}

export function sendMessage(chat: LocalChat, text: string): void {
  const input = chat.shadowRoot?.querySelector<HTMLTextAreaElement>('[part="input"]')
  if (!input) throw new Error('input not found')
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="send"]')?.click()
}

export interface MockSessionOptions {
  promptResponse?: string
  promptStreamingChunks?: string[]
}

export function createMockSession(options: MockSessionOptions = {}): LanguageModelSession {
  const session: LanguageModelSession = {
    prompt: vi.fn(async () => options.promptResponse ?? ''),
    promptStreaming: vi.fn(() => {
      const chunks = options.promptStreamingChunks ?? []
      return new ReadableStream<string>({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(chunk)
          controller.close()
        },
      })
    }),
    append: vi.fn().mockResolvedValue(undefined),
    clone: vi.fn(async () => createMockSession(options)),
    destroy: vi.fn(),
  }
  return session
}

export function mockLanguageModel(
  options: {
    availability?: LanguageModelAvailability
    parentSession?: LanguageModelSession
  } = {},
): LanguageModelAPI {
  const { availability = 'available' } = options
  const parentSession = options.parentSession ?? createMockSession()
  return {
    availability: vi.fn().mockResolvedValue(availability),
    create: vi.fn().mockResolvedValue(parentSession),
  }
}
