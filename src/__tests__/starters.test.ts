import { afterEach, describe, expect, it } from 'vitest'
import { expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('Starters', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('renders nothing when starters is unset', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelectorAll('[part="starter"]')).toHaveLength(0)
  })

  it('renders no pills container at all when starters is unset', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelector('[part="starters"]')).toBeNull()
  })

  it('renders a single plain-string starter as one pill', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('starters', 'Summarize this page')
    await flushMicrotasks()

    const pills = chat.shadowRoot?.querySelectorAll('[part="starter"]')
    expect(pills).toHaveLength(1)
    expect(pills?.[0]?.textContent).toBe('Summarize this page')
  })

  it('renders a JSON array of starters as multiple pills', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('starters', '["Summarize this page", "List named entities"]')
    await flushMicrotasks()

    const pills = chat.shadowRoot?.querySelectorAll('[part="starter"]')
    expect(pills).toHaveLength(2)
    expect(pills?.[0]?.textContent).toBe('Summarize this page')
    expect(pills?.[1]?.textContent).toBe('List named entities')
  })

  it('the .starters property wins when both attribute and property are set', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('starters', 'attribute value')
    chat.starters = 'property value'
    await flushMicrotasks()

    const pills = chat.shadowRoot?.querySelectorAll('[part="starter"]')
    expect(pills).toHaveLength(1)
    expect(pills?.[0]?.textContent).toBe('property value')
  })

  it('clicking a Starter pill sends it as the first message', async () => {
    const LM = mockLanguageModel()
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.setAttribute('starters', 'Summarize this page')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const pill = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="starter"]')
    pill?.click()
    await flushMicrotasks()

    const transcript = chat.shadowRoot?.querySelector('[part="transcript"]')
    expect(transcript?.textContent).toContain('Summarize this page')
  })
})
