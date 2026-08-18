import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

describe('Shadow DOM styling', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('includes a stylesheet using custom properties for host theming', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const style = chat.shadowRoot?.querySelector('style')
    expect(style).not.toBeNull()
    expect(style?.textContent).toContain('var(--local-chat-')
  })

  it('collapses the outer margin of markdown-rendered block content in a message bubble', async () => {
    // jsdom doesn't apply the UA-default <p> margin this rule exists to
    // collapse, so a computed-style assertion here can't actually
    // discriminate -- this is a regression lock on the rule's presence.
    // Real spacing is verified against real Chrome instead.
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const style = chat.shadowRoot?.querySelector('style')
    expect(style?.textContent).toContain('[part~="message"] > :first-child')
    expect(style?.textContent).toContain('[part~="message"] > :last-child')
  })

  it('a code block renders as a real <pre><code> element, and the stylesheet confines/styles it', async () => {
    // jsdom doesn't expose a usable CSSStyleSheet for a <style> inside a
    // shadow root here (style.sheet is null), so a computed-style assertion
    // for this rule can't actually discriminate -- the same category of
    // jsdom CSS-engine gap hit earlier for [hidden] and :empty. This checks
    // the DOM structure the rule targets, plus a regression lock on the
    // rule's presence; the actual overflow/background behavior is verified
    // against real Chrome instead.
    const childSession = createMockSession({ promptStreamingChunks: ['```\nconst x = 1;\n```'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'show me some code')
    await flushMicrotasks()

    const pre = chat.shadowRoot?.querySelector('[part~="message-assistant"] pre')
    expect(pre?.querySelector('code')?.textContent).toBe('const x = 1;')

    const style = chat.shadowRoot?.querySelector('style')
    expect(style?.textContent).toContain('[part~="message"] pre')
    expect(style?.textContent).toContain('overflow-x: auto')
    expect(style?.textContent).toContain('var(--local-chat-code-background')
  })

  it('renders inline code (not inside pre) as a real <code> element, styled with the same background variable as code blocks', async () => {
    // Same jsdom CSS-engine limitation as above -- regression lock on the
    // rule's presence and the DOM structure; actual computed background is
    // verified against real Chrome instead.
    const childSession = createMockSession({ promptStreamingChunks: ['Use `const x = 1` inline.'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'show me inline code')
    await flushMicrotasks()

    const code = chat.shadowRoot?.querySelector('[part~="message-assistant"] code')
    expect(code?.closest('pre')).toBeNull()
    expect(code?.textContent).toBe('const x = 1')

    const style = chat.shadowRoot?.querySelector('style')
    expect(style?.textContent).toContain('[part~="message"] code {')
    expect(style?.textContent).toContain('[part~="message"] pre code {')
  })
})
