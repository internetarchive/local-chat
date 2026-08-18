import { afterEach, describe, expect, it } from 'vitest'
import { flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('LocalChat Collapsed/Expanded state', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('starts Collapsed by default (no collapsed attribute at all)', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector<HTMLElement>('[part="toggle"]')
    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    expect(toggle?.hidden).toBe(false)
    expect(panel?.hidden).toBe(true)
  })

  it('starts Collapsed when collapsed="true" is set explicitly', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('collapsed', 'true')
    await flushMicrotasks()

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    expect(panel?.hidden).toBe(true)
  })

  it('starts Expanded when collapsed="false" is set explicitly', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = document.createElement('local-chat')
    chat.setAttribute('collapsed', 'false')
    document.body.appendChild(chat)
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector<HTMLElement>('[part="toggle"]')
    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    expect(toggle?.hidden).toBe(true)
    expect(panel?.hidden).toBe(false)
  })

  it('clicking the toggle button expands a Collapsed Widget', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="toggle"]')
    toggle?.click()

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    expect(panel?.hidden).toBe(false)
    expect(toggle?.hidden).toBe(true)
  })

  it('pressing Escape while focus is inside the panel collapses the Widget', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    const input = chat.shadowRoot?.querySelector<HTMLInputElement>('[part="input"]')
    input?.focus()
    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    const toggle = chat.shadowRoot?.querySelector<HTMLElement>('[part="toggle"]')
    expect(panel?.hidden).toBe(true)
    expect(toggle?.hidden).toBe(false)
  })

  it('does not collapse when Escape is pressed outside the panel', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('collapsed', 'false')
    await flushMicrotasks()

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    const panel = chat.shadowRoot?.querySelector<HTMLElement>('[part="panel"]')
    expect(panel?.hidden).toBe(false)
  })
})
