import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

// jsdom doesn't implement setPointerCapture/releasePointerCapture at all -- polyfill
// with spies so dispatching pointerdown doesn't throw, and so we can assert on calls.
beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
})

describe('Panel header buttons', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('Clear button click is not swallowed by the header drag handle', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const header = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel-header"]')
    const clearButton = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="clear"]')
    if (!header || !clearButton) throw new Error('header or clear button not found')

    clearButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
    expect(header.setPointerCapture).not.toHaveBeenCalled()

    clearButton.click()
    // Clearing an empty conversation is a no-op observable via the panel
    // still rendering (Starters/Icebreakers re-render into the transcript)
    // without throwing.
    expect(chat.shadowRoot?.querySelector('[part="transcript"]')).not.toBeNull()
  })

  it('Close button click is not swallowed by the header drag handle', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const header = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel-header"]')
    const closeButton = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="panel-close"]')
    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    if (!header || !closeButton) throw new Error('header or close button not found')

    closeButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
    expect(header.setPointerCapture).not.toHaveBeenCalled()

    closeButton.click()
    expect(panel?.hidden).toBe(true)
  })

  it('still captures the pointer for a drag that starts directly on the header', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const header = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel-header"]')
    if (!header) throw new Error('header not found')

    header.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))
    expect(header.setPointerCapture).toHaveBeenCalled()
  })
})
