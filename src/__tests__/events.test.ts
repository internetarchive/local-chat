import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

function firstEventDetail(mock: ReturnType<typeof vi.fn>): unknown {
  const call = mock.mock.calls[0]
  if (!call) throw new Error('event listener was never called')
  return (call[0] as CustomEvent).detail
}

describe('Lifecycle events', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('dispatches message-sent when the user sends a message', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const onMessageSent = vi.fn()
    chat.addEventListener('message-sent', onMessageSent)

    sendMessage(chat, 'hello there')
    await flushMicrotasks()

    expect(onMessageSent).toHaveBeenCalledTimes(1)
    expect(firstEventDetail(onMessageSent)).toEqual({ text: 'hello there' })
  })

  it('dispatches response-received with the full rendered text once streaming finishes', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['Hello ', 'world'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const onResponseReceived = vi.fn()
    chat.addEventListener('response-received', onResponseReceived)

    sendMessage(chat, 'hi')
    await flushMicrotasks()

    expect(onResponseReceived).toHaveBeenCalledTimes(1)
    expect(firstEventDetail(onResponseReceived)).toEqual({ text: 'Hello world' })
  })

  it('dispatches error when generating a response fails', async () => {
    const childSession = createMockSession()
    vi.mocked(childSession.promptStreaming).mockImplementation(() => {
      throw new Error('boom')
    })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const onError = vi.fn()
    chat.addEventListener('error', onError)

    sendMessage(chat, 'hi')
    await flushMicrotasks()

    expect(onError).toHaveBeenCalledTimes(1)
    expect(firstEventDetail(onError)).toMatchObject({ error: expect.any(Error) })
  })
})
