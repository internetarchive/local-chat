import { afterEach, describe, expect, it } from 'vitest'
import { flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

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
})
