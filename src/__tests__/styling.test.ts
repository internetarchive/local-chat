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
})
