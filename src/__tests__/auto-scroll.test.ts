import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

function fakeScrollGeometry(el: HTMLElement, { scrollTop, scrollHeight, clientHeight }: Record<string, number>): void {
  Object.defineProperty(el, 'scrollTop', { value: scrollTop, writable: true, configurable: true })
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true })
}

describe('Auto-scroll', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('scrolls to the bottom when new content arrives and the user was already at the bottom', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const transcript = chat.shadowRoot?.querySelector<HTMLElement>('[part="transcript"]')
    if (!transcript) throw new Error('transcript not found')
    fakeScrollGeometry(transcript, { scrollTop: 100, scrollHeight: 120, clientHeight: 20 }) // at bottom

    sendMessage(chat, 'hello')
    await flushMicrotasks()

    expect(transcript.scrollTop).toBe(transcript.scrollHeight)
  })

  it('does not scroll when the user had scrolled away from the bottom', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const transcript = chat.shadowRoot?.querySelector<HTMLElement>('[part="transcript"]')
    if (!transcript) throw new Error('transcript not found')
    fakeScrollGeometry(transcript, { scrollTop: 0, scrollHeight: 500, clientHeight: 20 }) // scrolled up, far from bottom

    sendMessage(chat, 'hello')
    await flushMicrotasks()

    expect(transcript.scrollTop).toBe(0)
  })
})
