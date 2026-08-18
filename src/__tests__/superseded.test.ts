import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

describe('Superseded Follow-up/Icebreaker calls', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('destroys the Follow-up Scratch Session and discards its result when a new message supersedes it', async () => {
    let resolveFollowupPrompt: (value: string) => void = () => {}
    const followupScratch = createMockSession()
    vi.mocked(followupScratch.prompt).mockReturnValue(
      new Promise((resolve) => {
        resolveFollowupPrompt = resolve
      }),
    )
    const childSession = createMockSession({ promptStreamingChunks: ['first reply'] })
    vi.mocked(childSession.clone).mockResolvedValueOnce(followupScratch)
    const secondChildSession = createMockSession({ promptStreamingChunks: ['second reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'first')
    await flushMicrotasks()
    // The Follow-up Scratch Session's prompt() call is now in-flight, unresolved.
    expect(followupScratch.prompt).toHaveBeenCalledTimes(1)
    expect(followupScratch.destroy).not.toHaveBeenCalled()

    // A second message supersedes it before it resolves.
    void secondChildSession
    sendMessage(chat, 'second')
    await flushMicrotasks()

    expect(followupScratch.destroy).toHaveBeenCalledTimes(1)

    // Even if the stale call resolves after being superseded, it must never render.
    resolveFollowupPrompt('["stale suggestion"]')
    await flushMicrotasks()

    const pills = chat.shadowRoot?.querySelectorAll('[part="followup"]')
    expect(pills).toHaveLength(0)
  })

  it('destroys the Icebreaker Scratch Session and discards its result when a message supersedes it', async () => {
    let resolveIcebreakerPrompt: (value: string) => void = () => {}
    const icebreakerScratch = createMockSession()
    vi.mocked(icebreakerScratch.prompt).mockReturnValue(
      new Promise((resolve) => {
        resolveIcebreakerPrompt = resolve
      }),
    )
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
    // Icebreaker generation is now in-flight, unresolved.
    expect(icebreakerScratch.prompt).toHaveBeenCalledTimes(1)

    sendMessage(chat, 'hello')
    await flushMicrotasks()

    expect(icebreakerScratch.destroy).toHaveBeenCalledTimes(1)

    resolveIcebreakerPrompt('["stale icebreaker"]')
    await flushMicrotasks()

    const pills = chat.shadowRoot?.querySelectorAll('[part="icebreaker"]')
    expect(pills).toHaveLength(0)
  })
})
