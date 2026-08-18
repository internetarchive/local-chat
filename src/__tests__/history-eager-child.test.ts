import { afterEach, describe, expect, it, vi } from 'vitest'
import { appendExchange } from '../history.js'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

describe('Eager Child Session fork+replay when History is restored', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
    localStorage.clear()
  })

  it('forks and primes a Child Session as soon as the Parent Session resolves, without a new message', async () => {
    appendExchange('url', { user: 'first question', assistant: 'first answer' }, 5)
    const childSession = createMockSession()
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    expect(parentSession.clone).toHaveBeenCalledTimes(1)
    expect(childSession.append).toHaveBeenCalledWith([
      { role: 'user', content: 'first question' },
      { role: 'assistant', content: 'first answer' },
    ])
  })

  it('replays multiple restored Exchanges in chronological order', async () => {
    appendExchange('url', { user: 'q1', assistant: 'a1' }, 5)
    appendExchange('url', { user: 'q2', assistant: 'a2' }, 5)
    const childSession = createMockSession()
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    expect(childSession.append).toHaveBeenCalledWith([
      { role: 'user', content: 'q1' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'q2' },
      { role: 'assistant', content: 'a2' },
    ])
  })

  it('a message sent before the eager replay finishes reuses the same Child Session, not a second fork', async () => {
    appendExchange('url', { user: 'q', assistant: 'a' }, 5)
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    // Send immediately, before awaiting -- racing the eager fork/replay.
    sendMessage(chat, 'new message')
    await flushMicrotasks()

    expect(parentSession.clone).toHaveBeenCalledTimes(1)
    expect(childSession.promptStreaming).toHaveBeenCalledWith('new message', expect.anything())
  })

  it('does not eagerly fork a Child Session when there is no History to restore', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    expect(parentSession.clone).not.toHaveBeenCalled()
  })
})
