import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { collapseWidget, expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

// jsdom doesn't implement setPointerCapture/releasePointerCapture at all -- polyfill
// with spies so dispatching pointerdown doesn't throw.
beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
})

function stubRect(el: HTMLElement, width: number, height: number, left = 0, top = 0): void {
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

function drag(handle: HTMLElement, fromX: number, fromY: number, toX: number, toY: number, pointerId = 1): void {
  handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId, clientX: fromX, clientY: fromY }))
  window.dispatchEvent(new PointerEvent('pointermove', { pointerId, clientX: toX, clientY: toY }))
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId }))
}

describe('Persisted Visual state', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('persists Collapsed/Expanded across a fresh mount in the same scope', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const first = mount()
    await flushMicrotasks()
    expandWidget(first)

    const second = mount()
    await flushMicrotasks()

    expect(second.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')?.hidden).toBe(false)
  })

  it('a persisted Collapsed value overrides an explicit collapsed attribute on a later mount', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const first = mount()
    await flushMicrotasks()
    expandWidget(first)

    const second = mount()
    second.setAttribute('collapsed', '') // explicit "start Collapsed" -- persisted Expanded still wins
    await flushMicrotasks()

    expect(second.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')?.hidden).toBe(false)
  })

  it('the collapsed attribute only seeds the very first visit -- no persisted value yet', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')?.hidden).toBe(false)
  })

  it('collapsing via Escape persists the same as any other transition', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const first = mount()
    first.setAttribute('collapsed', 'false')
    await flushMicrotasks()
    first.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    const second = mount()
    second.setAttribute('collapsed', 'false') // explicit "start Expanded" -- persisted Collapsed still wins
    await flushMicrotasks()

    expect(second.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')?.hidden).toBe(true)
  })

  it('does not persist Collapsed state at all until a real transition happens', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    mount()
    await flushMicrotasks() // Renders with the default (Collapsed) state -- no transition yet.

    const second = mount()
    second.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    expect(second.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')?.hidden).toBe(false)
  })

  it('persists the toggle position across a fresh mount once dragged', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const first = mount()
    await flushMicrotasks()

    const toggle = first.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')
    if (!toggle) throw new Error('toggle not found')
    stubRect(toggle, 52, 52, 900, 700)
    drag(toggle, 926, 726, 100, 100)

    const second = mount()
    await flushMicrotasks()
    const secondToggle = second.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')

    expect(secondToggle?.style.left).toBe(toggle.style.left)
    expect(secondToggle?.style.top).toBe(toggle.style.top)
  })

  it('does not persist the toggle position from a plain click that never moved it', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const first = mount()
    await flushMicrotasks()

    const toggle = first.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')
    if (!toggle) throw new Error('toggle not found')
    stubRect(toggle, 52, 52, 900, 700)
    drag(toggle, 926, 726, 927, 727) // well under the 3px drag threshold

    const second = mount()
    await flushMicrotasks()
    const secondToggle = second.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')

    expect(secondToggle?.style.left).toBe('')
    expect(secondToggle?.style.right).toBe('')
  })

  it('persists the panel position across a fresh mount once dragged', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const first = mount()
    first.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    const header = first.shadowRoot?.querySelector<HTMLElement>('[part="panel-header"]')
    const panel = first.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    if (!header || !panel) throw new Error('header or panel not found')
    stubRect(panel, 352, 448, 900, 600)
    drag(header, 926, 626, 100, 100)

    const second = mount()
    second.setAttribute('collapsed', 'false')
    await flushMicrotasks()
    const secondPanel = second.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')

    expect(secondPanel?.style.left).toBe(panel.style.left)
    expect(secondPanel?.style.top).toBe(panel.style.top)
  })

  it('persists the panel size across a fresh mount once resized', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const first = mount()
    first.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    const panel = first.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    const handle = first.shadowRoot?.querySelector<HTMLElement>('[part="resize-handle"]')
    if (!panel || !handle) throw new Error('panel or resize handle not found')
    stubRect(panel, 352, 448)
    drag(handle, 300, 300, 250, 270)

    const second = mount()
    second.setAttribute('collapsed', 'false')
    await flushMicrotasks()
    const secondPanel = second.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')

    expect(secondPanel?.style.width).toBe(panel.style.width)
    expect(secondPanel?.style.height).toBe(panel.style.height)
  })

  it('does not persist panel size from a plain click on the resize handle that never moved it', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const first = mount()
    first.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    const panel = first.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    const handle = first.shadowRoot?.querySelector<HTMLElement>('[part="resize-handle"]')
    if (!panel || !handle) throw new Error('panel or resize handle not found')
    stubRect(panel, 352, 448)
    drag(handle, 300, 300, 301, 301) // well under the 3px threshold

    const second = mount()
    second.setAttribute('collapsed', 'false')
    await flushMicrotasks()
    const secondPanel = second.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')

    expect(secondPanel?.style.width).toBe('')
    expect(secondPanel?.style.height).toBe('')
  })

  it('isolates Visual state between different storage-key scopes', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const first = mount()
    first.setAttribute('storage-key', 'scope-a')
    await flushMicrotasks()
    expandWidget(first)

    const second = mount()
    second.setAttribute('storage-key', 'scope-b')
    await flushMicrotasks()

    expect(second.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')?.hidden).toBe(true)
  })

  it('collapsing does not undo an already-persisted panel position or size', async () => {
    vi.stubGlobal('innerWidth', 1000)
    vi.stubGlobal('innerHeight', 800)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const first = mount()
    first.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    const header = first.shadowRoot?.querySelector<HTMLElement>('[part="panel-header"]')
    const panel = first.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    if (!header || !panel) throw new Error('header or panel not found')
    stubRect(panel, 352, 448, 900, 600)
    drag(header, 926, 626, 100, 100)
    const draggedLeft = panel.style.left

    collapseWidget(first)

    const second = mount()
    second.setAttribute('collapsed', 'false')
    await flushMicrotasks()
    const secondPanel = second.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')

    expect(secondPanel?.style.left).toBe(draggedLeft)
  })
})
