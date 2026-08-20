import { afterEach, describe, expect, it } from 'vitest'
import { readHistory } from '../history.js'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

describe('Persisting History after a response', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
    localStorage.clear()
  })

  it('writes the completed Exchange to History once the response finishes', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['Hello ', 'world'] })
    const parentSession = createMockSession()
    parentSession.clone = async () => childSession
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hi there')
    await flushMicrotasks()

    expect(readHistory('url', 5)).toEqual([{ user: 'hi there', assistant: 'Hello world' }])
  })

  it('appends subsequent Exchanges alongside earlier ones', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['first reply'] })
    const parentSession = createMockSession()
    parentSession.clone = async () => childSession
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'first question')
    await flushMicrotasks()

    expect(readHistory('url', 5)).toEqual([{ user: 'first question', assistant: 'first reply' }])
  })

  it('never writes an Exchange when the response errors', async () => {
    const childSession = createMockSession()
    childSession.promptStreaming = () => {
      throw new Error('boom')
    }
    const parentSession = createMockSession()
    parentSession.clone = async () => childSession
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hi there')
    await flushMicrotasks()

    expect(readHistory('url', 5)).toEqual([])
  })

  it('does not persist History when max-history is 0', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    parentSession.clone = async () => childSession
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.setAttribute('max-history', '0')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hi there')
    await flushMicrotasks()

    expect(readHistory('url', 5)).toEqual([])
  })

  it('namespaces persisted Exchanges under the configured storage-key', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    parentSession.clone = async () => childSession
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.setAttribute('storage-key', 'my-app')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hi there')
    await flushMicrotasks()

    expect(readHistory('my-app', 5)).toEqual([{ user: 'hi there', assistant: 'reply' }])
    expect(readHistory('url', 5)).toEqual([])
  })
})
