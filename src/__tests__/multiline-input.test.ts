import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('Multi-line input', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('renders the input as a textarea', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const input = chat.shadowRoot?.querySelector('[part="input"]')
    expect(input?.tagName).toBe('TEXTAREA')
  })

  it('Enter (without Shift) sends the message and prevents the default newline', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const input = chat.shadowRoot?.querySelector<HTMLTextAreaElement>('[part="input"]')
    if (!input) throw new Error('input not found')
    input.value = 'hello'

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    input.dispatchEvent(event)
    await flushMicrotasks()

    expect(event.defaultPrevented).toBe(true)
    expect(childSession.promptStreaming).toHaveBeenCalledWith('hello', expect.anything())
    expect(input.value).toBe('')
  })

  it('Shift+Enter does not send and leaves the default newline behavior alone', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const input = chat.shadowRoot?.querySelector<HTMLTextAreaElement>('[part="input"]')
    if (!input) throw new Error('input not found')
    input.value = 'hello'

    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true })
    input.dispatchEvent(event)
    await flushMicrotasks()

    expect(event.defaultPrevented).toBe(false)
    expect(childSession.promptStreaming).not.toHaveBeenCalled()
    expect(input.value).toBe('hello')
  })

  it('Enter while an IME composition is in progress does not send', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const input = chat.shadowRoot?.querySelector<HTMLTextAreaElement>('[part="input"]')
    if (!input) throw new Error('input not found')
    input.value = 'こんにちは'

    const event = new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true })
    input.dispatchEvent(event)
    await flushMicrotasks()

    expect(childSession.promptStreaming).not.toHaveBeenCalled()
  })

  it('auto-grows the input height to fit its content', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const input = chat.shadowRoot?.querySelector<HTMLTextAreaElement>('[part="input"]')
    if (!input) throw new Error('input not found')
    Object.defineProperty(input, 'scrollHeight', {
      get: () => (input.value.length > 0 ? 60 : 20),
      configurable: true,
    })

    input.value = 'a long multi-line message'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    expect(input.style.height).toBe('60px')
  })

  it('resets the input height back down after sending', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const input = chat.shadowRoot?.querySelector<HTMLTextAreaElement>('[part="input"]')
    if (!input) throw new Error('input not found')
    Object.defineProperty(input, 'scrollHeight', {
      get: () => (input.value.length > 0 ? 60 : 20),
      configurable: true,
    })

    input.value = 'a long multi-line message'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(input.style.height).toBe('60px')

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await flushMicrotasks()

    expect(input.style.height).toBe('20px')
  })
})
