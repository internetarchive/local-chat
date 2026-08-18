import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LanguageModelSession } from '../language-model.js'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

// jsdom's CSS engine doesn't resolve the [part~="message"]:empty vs.
// [part~="message-assistant"] cascade correctly (a similar gap to the earlier
// [hidden]-vs-author-display cascade issue) -- computed getComputedStyle()
// checks here would be false negatives despite the real DOM state being
// correct, and despite the fix being confirmed working in real Chrome. These
// tests instead verify the DOM state the CSS rule keys off (an empty bubble
// has zero child nodes) and that the CSS rule itself is present.
describe('Empty assistant responses', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('leaves the bubble with no child nodes before any content has streamed in', async () => {
    let controllerRef: ReadableStreamDefaultController<string> | undefined
    const childSession: LanguageModelSession = {
      prompt: vi.fn().mockResolvedValue(''),
      promptStreaming: vi.fn(
        () =>
          new ReadableStream<string>({
            start(controller) {
              controllerRef = controller
            },
          }),
      ),
      append: vi.fn().mockResolvedValue(undefined),
      clone: vi.fn(async () => createMockSession()),
      destroy: vi.fn(),
    }
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

    const assistantBubble = chat.shadowRoot?.querySelector<HTMLElement>('[part~="message-assistant"]')
    if (!assistantBubble) throw new Error('assistant bubble not found')
    expect(assistantBubble.childNodes.length).toBe(0)

    controllerRef?.enqueue('Hello!')
    controllerRef?.close()
    await flushMicrotasks()

    expect(assistantBubble.childNodes.length).toBeGreaterThan(0)
  })

  it('has no child nodes if the response resolves genuinely empty', async () => {
    const childSession = createMockSession({ promptStreamingChunks: [] })
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

    const assistantBubble = chat.shadowRoot?.querySelector<HTMLElement>('[part~="message-assistant"]')
    if (!assistantBubble) throw new Error('assistant bubble not found')
    expect(assistantBubble.childNodes.length).toBe(0)
  })

  it('the stylesheet hides empty message bubbles', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const style = chat.shadowRoot?.querySelector('style')
    expect(style?.textContent).toContain('[part~="message"]:empty')
  })
})
