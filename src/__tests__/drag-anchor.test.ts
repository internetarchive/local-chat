import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { collapseWidget, expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

// jsdom doesn't implement setPointerCapture/releasePointerCapture at all -- polyfill
// with spies so dispatching pointerdown doesn't throw.
beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
})

function stubRect(el: HTMLElement, width: number, height: number, left: number, top: number): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
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

  it('anchors the toggle via right/bottom when dragged into the bottom-right area of the viewport', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')
    if (!toggle) throw new Error('toggle not found')
    stubRect(toggle, 52, 52, 900, 700) // already near the bottom-right

    drag(toggle, 926, 726, 946, 746) // drag further toward the bottom-right corner

    expect(toggle.style.right).not.toBe('auto')
    expect(toggle.style.bottom).not.toBe('auto')
    expect(toggle.style.left).toBe('auto')
    expect(toggle.style.top).toBe('auto')
  })

  it('anchors the toggle via left/top when dragged into the top-left area of the viewport', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')
    if (!toggle) throw new Error('toggle not found')
    stubRect(toggle, 52, 52, 900, 700)

    drag(toggle, 926, 726, 26, 26) // drag all the way to the top-left corner

    expect(toggle.style.left).not.toBe('auto')
    expect(toggle.style.top).not.toBe('auto')
    expect(toggle.style.right).toBe('auto')
    expect(toggle.style.bottom).toBe('auto')
  })

  it('the header (panel drag) uses the same anchor-flipping logic, on the panel itself', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    const header = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel-header"]')
    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    if (!header || !panel) throw new Error('header or panel not found')
    stubRect(panel, 352, 448, 900, 600) // panel near the bottom-right

    drag(header, 926, 626, 946, 646)

    expect(panel.style.right).not.toBe('auto')
    expect(panel.style.bottom).not.toBe('auto')
    expect(panel.style.left).toBe('auto')
    expect(panel.style.top).toBe('auto')
  })

  it('allows dragging past the viewport edge -- no clamping', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')
    if (!toggle) throw new Error('toggle not found')
    stubRect(toggle, 52, 52, 900, 700)

    // Drag far past the bottom-right corner of the viewport.
    drag(toggle, 926, 726, 1400, 1200)

    // Anchored via right/bottom (still in the bottom-right quadrant), but the
    // offset itself is negative -- the toggle is allowed to sit off-screen.
    expect(Number.parseFloat(toggle.style.right)).toBeLessThan(0)
    expect(Number.parseFloat(toggle.style.bottom)).toBeLessThan(0)
  })

  it('dragging the panel does not affect the toggle icon position, and vice versa', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')
    if (!toggle) throw new Error('toggle not found')

    // The toggle starts at its default (undragged) position -- no inline
    // left/top/right/bottom set at all.
    expect(toggle.style.left).toBe('')
    expect(toggle.style.right).toBe('')

    expandWidget(chat)
    const header = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel-header"]')
    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    if (!header || !panel) throw new Error('header or panel not found')
    stubRect(panel, 352, 448, 300, 200)

    drag(header, 476, 424, 100, 100) // drag the panel toward the top-left

    expect(panel.style.left).not.toBe('auto')
    expect(panel.style.top).not.toBe('auto')

    // The toggle's own position is completely untouched by dragging the panel.
    expect(toggle.style.left).toBe('')
    expect(toggle.style.right).toBe('')
    expect(toggle.style.top).toBe('')
    expect(toggle.style.bottom).toBe('')

    collapseWidget(chat)

    // Collapsing doesn't move the toggle to wherever the panel was dragged --
    // it stays at its own last (in this case, still-default) position.
    expect(toggle.style.left).toBe('')
    expect(toggle.style.right).toBe('')
  })
})
