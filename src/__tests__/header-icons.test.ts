import { afterEach, describe, expect, it } from 'vitest'
import { expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('Header button iconography', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('Clear is an icon button with its label moved to a tooltip', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const clearButton = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="clear"]')
    if (!clearButton) throw new Error('clear button not found')
    expect(clearButton.textContent).not.toBe('Clear')
    expect(clearButton.title).toBe('Clear conversation')
    expect(clearButton.getAttribute('aria-label')).toBe('Clear conversation')
  })

  it('Close has a matching tooltip', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const closeButton = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="panel-close"]')
    if (!closeButton) throw new Error('close button not found')
    expect(closeButton.title).toBe('Collapse chat')
    expect(closeButton.getAttribute('aria-label')).toBe('Collapse chat')
  })
})
