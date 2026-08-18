import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { collapseWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

// jsdom doesn't implement setPointerCapture/releasePointerCapture at all -- polyfill
// with spies so dispatching pointerdown doesn't throw.
beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
})

function stubHostRect(chat: HTMLElement, width: number, height: number, left: number, top: number): void {
  vi.spyOn(chat, 'getBoundingClientRect').mockReturnValue({
    width,
    height,
    left,
    top,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {
      return {}
    },
  } as DOMRect)
}

function drag(handle: HTMLElement, fromX: number, fromY: number, toX: number, toY: number): void {
  handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: fromX, clientY: fromY }))
  window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: toX, clientY: toY }))
}

describe('Drag anchor flipping', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('anchors via right/bottom when the toggle is dragged into the bottom-right area of the viewport', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')
    if (!toggle) throw new Error('toggle not found')
    stubHostRect(chat, 52, 52, 900, 700) // already near the bottom-right

    drag(toggle, 926, 726, 946, 746) // drag further toward the bottom-right corner

    expect(chat.style.right).not.toBe('auto')
    expect(chat.style.bottom).not.toBe('auto')
    expect(chat.style.left).toBe('auto')
    expect(chat.style.top).toBe('auto')
  })

  it('anchors via left/top when the toggle is dragged into the top-left area of the viewport', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')
    if (!toggle) throw new Error('toggle not found')
    stubHostRect(chat, 52, 52, 900, 700)

    drag(toggle, 926, 726, 26, 26) // drag all the way to the top-left corner

    expect(chat.style.left).not.toBe('auto')
    expect(chat.style.top).not.toBe('auto')
    expect(chat.style.right).toBe('auto')
    expect(chat.style.bottom).toBe('auto')
  })

  it('the header (panel drag) uses the same anchor-flipping logic', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    const header = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel-header"]')
    if (!header) throw new Error('header not found')
    stubHostRect(chat, 352, 448, 900, 600) // panel near the bottom-right

    drag(header, 926, 626, 946, 646)

    expect(chat.style.right).not.toBe('auto')
    expect(chat.style.bottom).not.toBe('auto')
    expect(chat.style.left).toBe('auto')
    expect(chat.style.top).toBe('auto')
  })

  it('clamps position during the drag itself, never letting the box past the viewport edge', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')
    if (!toggle) throw new Error('toggle not found')
    stubHostRect(chat, 52, 52, 900, 700)

    // Drag far past the bottom-right corner of the viewport.
    drag(toggle, 926, 726, 1400, 1200)

    expect(chat.style.right).toBe('0px')
    expect(chat.style.bottom).toBe('0px')
  })

  it('re-clamps on collapse when the panel had been dragged so its lower edge hung past the viewport', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    // Simulate a stale off-screen anchor (as could arise before the drag-time
    // clamp existed): the panel's bottom edge sits 398px past the viewport's
    // bottom edge.
    chat.style.left = 'auto'
    chat.style.right = '20px'
    chat.style.top = 'auto'
    chat.style.bottom = '-398px'

    // The toggle icon (52x52), rendered at that same stale anchor, would sit
    // entirely below the viewport.
    stubHostRect(chat, 52, 52, 928, 800 + 346)

    collapseWidget(chat)

    const bottom = Number.parseFloat(chat.style.bottom === 'auto' ? '0' : chat.style.bottom)
    const top = Number.parseFloat(chat.style.top === 'auto' ? '0' : chat.style.top)
    expect(chat.style.bottom === 'auto' || bottom >= 0).toBe(true)
    expect(chat.style.top === 'auto' || top <= 800 - 52).toBe(true)
  })
})
