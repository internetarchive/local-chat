import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

function clearConversation(chat: HTMLElement): void {
  chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="clear"]')?.click()
}

describe('Clear', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('destroys the current Child Session', async () => {
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

    clearConversation(chat)
    await flushMicrotasks()

    expect(childSession.destroy).toHaveBeenCalledTimes(1)
  })

  it('empties the transcript', async () => {
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

    clearConversation(chat)

    const transcript = chat.shadowRoot?.querySelector('[part="transcript"]')
    expect(transcript?.childElementCount).toBe(0)
  })

  it('does not re-create the Parent Session, only forks a fresh Child on the next message', async () => {
    const firstChild = createMockSession({ promptStreamingChunks: ['first reply'] })
    const secondChild = createMockSession({ promptStreamingChunks: ['second reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValueOnce(firstChild).mockResolvedValueOnce(secondChild)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()
    sendMessage(chat, 'hello')
    await flushMicrotasks()

    clearConversation(chat)
    sendMessage(chat, 'hello again')
    await flushMicrotasks()

    expect(LM.create).toHaveBeenCalledTimes(1)
    expect(parentSession.clone).toHaveBeenCalledTimes(2)
    expect(secondChild.promptStreaming).toHaveBeenCalledWith('hello again', expect.anything())
  })

  it('re-shows Starters again after clearing', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.setAttribute('starters', 'Summarize this page')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()
    sendMessage(chat, 'hello')
    await flushMicrotasks()

    clearConversation(chat)

    const pills = chat.shadowRoot?.querySelectorAll('[part="starter"]')
    expect(pills).toHaveLength(1)
  })

  it('re-shows cached Icebreakers again after clearing, without regenerating them', async () => {
    const icebreakerScratch = createMockSession({ promptResponse: '["Q1?"]' })
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockImplementation(async (): Promise<ReturnType<typeof createMockSession>> => {
      return vi.mocked(parentSession.clone).mock.calls.length === 1 ? icebreakerScratch : childSession
    })
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.setAttribute('icebreakers', '')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()
    sendMessage(chat, 'hello')
    await flushMicrotasks()

    clearConversation(chat)

    const pills = chat.shadowRoot?.querySelectorAll('[part="icebreaker"]')
    expect(pills).toHaveLength(1)
    expect(icebreakerScratch.prompt).toHaveBeenCalledTimes(1)
  })
})
