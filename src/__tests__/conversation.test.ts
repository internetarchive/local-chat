import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

describe('Sending a message', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('forks a Child Session from the Parent on the first message', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['Hi there'] })
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

    expect(parentSession.clone).toHaveBeenCalledTimes(1)
    expect(childSession.promptStreaming).toHaveBeenCalledWith('hello', expect.anything())
  })

  it('renders the streamed reply as markdown in the transcript', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['Hi ', '**there**'] })
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

    const transcript = chat.shadowRoot?.querySelector('[part="transcript"]')
    expect(transcript?.innerHTML).toContain('<strong>there</strong>')
  })

  it('renders the user message in the transcript too', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hello there')
    await flushMicrotasks()

    const transcript = chat.shadowRoot?.querySelector('[part="transcript"]')
    expect(transcript?.textContent).toContain('hello there')
  })

  it('clears the input after sending', async () => {
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

    const input = chat.shadowRoot?.querySelector<HTMLInputElement>('[part="input"]')
    expect(input?.value).toBe('')
  })

  it('reuses the same Child Session for a second message, not forking again', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
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
    sendMessage(chat, 'second')
    await flushMicrotasks()

    expect(parentSession.clone).toHaveBeenCalledTimes(1)
    expect(childSession.promptStreaming).toHaveBeenCalledTimes(2)
  })

  it('does nothing when the input is blank', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, '   ')
    await flushMicrotasks()

    expect(parentSession.clone).not.toHaveBeenCalled()
  })
})
