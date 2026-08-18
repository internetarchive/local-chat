import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

// jsdom doesn't implement setPointerCapture/releasePointerCapture at all -- polyfill
// with spies so dispatching pointerdown doesn't throw.
beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
})

function stubRect(el: HTMLElement, width: number, height: number): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON() {
      return {}
    },
  } as DOMRect)
}

describe('Panel resize handle', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('is positioned at the top-left of the panel', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const handle = chat.shadowRoot?.querySelector<HTMLElement>('[part="resize-handle"]')
    expect(handle).not.toBeNull()
  })

  it('grows the panel when the handle is dragged up and to the left', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    const handle = chat.shadowRoot?.querySelector<HTMLElement>('[part="resize-handle"]')
    if (!panel || !handle) throw new Error('panel or resize handle not found')
    stubRect(panel, 352, 448)

    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 300, clientY: 300 }))
    handle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1, clientX: 250, clientY: 270 }))

    expect(panel.style.width).toBe('402px')
    expect(panel.style.height).toBe('478px')
  })

  it('shrinks the panel when the handle is dragged down and to the right', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    const handle = chat.shadowRoot?.querySelector<HTMLElement>('[part="resize-handle"]')
    if (!panel || !handle) throw new Error('panel or resize handle not found')
    stubRect(panel, 352, 448)

    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: 300, clientY: 300 }))
    handle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, composed: true, pointerId: 1, clientX: 340, clientY: 330 }))

    expect(panel.style.width).toBe('312px')
    expect(panel.style.height).toBe('418px')
  })
})
