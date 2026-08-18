import { afterEach, describe, expect, it, vi } from 'vitest'
import { readHistory } from '../history.js'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

function clearConversation(chat: HTMLElement): void {
  chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="clear"]')?.click()
}

describe('Clear purges persisted History', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('removes the persisted History for the current storage scope', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()
    sendMessage(chat, 'hello')
    await flushMicrotasks()
    expect(readHistory('url', 5)).toEqual([{ user: 'hello', assistant: 'reply' }])

    clearConversation(chat)

    expect(readHistory('url', 5)).toEqual([])
  })

  it('does not affect History under a different storage scope', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.setAttribute('history-key', 'my-app')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()
    sendMessage(chat, 'hello')
    await flushMicrotasks()
    expect(readHistory('my-app', 5)).toEqual([{ user: 'hello', assistant: 'reply' }])

    clearConversation(chat)

    expect(readHistory('my-app', 5)).toEqual([])
  })
})
