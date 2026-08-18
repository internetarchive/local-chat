import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('Trigger public methods', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('expand() Expands a Collapsed Widget', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    chat.expand()

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    expect(panel?.hidden).toBe(false)
  })

  it('collapse() Collapses an Expanded Widget', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    chat.collapse()

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    expect(panel?.hidden).toBe(true)
  })

  it('toggle() flips between Collapsed and Expanded', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')

    chat.toggle()
    expect(panel?.hidden).toBe(false)

    chat.toggle()
    expect(panel?.hidden).toBe(true)
  })
})

describe('local-chat-expanded / local-chat-collapsed events', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('dispatches local-chat-expanded when the Widget transitions to Expanded', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()
    const onExpanded = vi.fn()
    chat.addEventListener('local-chat-expanded', onExpanded)

    chat.expand()

    expect(onExpanded).toHaveBeenCalledTimes(1)
  })

  it('dispatches local-chat-collapsed when the Widget transitions to Collapsed', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('collapsed', 'false')
    await flushMicrotasks()
    const onCollapsed = vi.fn()
    chat.addEventListener('local-chat-collapsed', onCollapsed)

    chat.collapse()

    expect(onCollapsed).toHaveBeenCalledTimes(1)
  })

  it('does not dispatch anything for the initial state established at render time', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('collapsed', 'false')
    const onExpanded = vi.fn()
    const onCollapsed = vi.fn()
    chat.addEventListener('local-chat-expanded', onExpanded)
    chat.addEventListener('local-chat-collapsed', onCollapsed)
    await flushMicrotasks()

    expect(onExpanded).not.toHaveBeenCalled()
    expect(onCollapsed).not.toHaveBeenCalled()
  })

  it('does not dispatch when calling expand() while already Expanded', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('collapsed', 'false')
    await flushMicrotasks()
    const onExpanded = vi.fn()
    chat.addEventListener('local-chat-expanded', onExpanded)

    chat.expand()

    expect(onExpanded).not.toHaveBeenCalled()
  })
})

describe('hide-toggle', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('never renders the floating toggle button when hide-toggle is set', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('hide-toggle', '')
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector('[part="toggle"]')
    expect(toggle).toBeNull()
  })

  it('still renders the toggle button when hide-toggle is absent', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector('[part="toggle"]')
    expect(toggle).not.toBeNull()
  })
})

describe('trigger-selector', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('clicking a matching element Expands the Widget', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const button = document.createElement('button')
    button.id = 'my-trigger'
    document.body.appendChild(button)
    const chat = document.createElement('local-chat')
    chat.setAttribute('trigger-selector', '#my-trigger')
    document.body.appendChild(chat)
    await flushMicrotasks()

    button.click()

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    expect(panel?.hidden).toBe(false)
  })

  it('clicking it again Collapses the Widget (full toggle)', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const button = document.createElement('button')
    button.id = 'my-trigger'
    document.body.appendChild(button)
    const chat = document.createElement('local-chat')
    chat.setAttribute('trigger-selector', '#my-trigger')
    document.body.appendChild(chat)
    await flushMicrotasks()

    button.click()
    button.click()

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    expect(panel?.hidden).toBe(true)
  })

  it('wires up every element matching the selector', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const button1 = document.createElement('button')
    button1.className = 'my-trigger'
    const button2 = document.createElement('button')
    button2.className = 'my-trigger'
    document.body.append(button1, button2)
    const chat = document.createElement('local-chat')
    chat.setAttribute('trigger-selector', '.my-trigger')
    document.body.appendChild(chat)
    await flushMicrotasks()

    button1.click()
    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    expect(panel?.hidden).toBe(false)

    button2.click()
    expect(panel?.hidden).toBe(true)
  })

  it('does nothing (no throw, stays Collapsed) when the selector matches no element', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = document.createElement('local-chat')
    chat.setAttribute('trigger-selector', '#does-not-exist')
    document.body.appendChild(chat)
    await flushMicrotasks()

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    expect(panel?.hidden).toBe(true)
  })

  it('never mutates aria-expanded or any other attribute on the matched element', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const button = document.createElement('button')
    button.id = 'my-trigger'
    document.body.appendChild(button)
    const chat = document.createElement('local-chat')
    chat.setAttribute('trigger-selector', '#my-trigger')
    document.body.appendChild(chat)
    await flushMicrotasks()

    button.click()

    expect(button.getAttribute('aria-expanded')).toBeNull()
  })
})
