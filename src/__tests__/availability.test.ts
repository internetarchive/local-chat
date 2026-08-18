import { afterEach, describe, expect, it } from 'vitest'
import { flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('LocalChat availability gating', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('renders nothing when LanguageModel is not present at all', async () => {
    const chat = mount()
    await flushMicrotasks()

    expect(chat.shadowRoot?.childElementCount).toBe(0)
  })

  it('renders nothing while availability is still resolving', () => {
    let resolveAvailability: (value: string) => void = () => {}
    const pending = new Promise<string>((resolve) => {
      resolveAvailability = resolve
    })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = {
      availability: () => pending,
      create: () => Promise.reject(new Error('should not be called yet')),
    }

    const chat = mount()

    expect(chat.shadowRoot?.childElementCount).toBe(0)
    void resolveAvailability
  })

  it('renders the Widget once availability resolves to available', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel({ availability: 'available' })

    const chat = mount()
    await flushMicrotasks()

    expect(chat.shadowRoot?.childElementCount).toBeGreaterThan(0)
  })

  it('renders the Widget when the model is downloadable', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel({ availability: 'downloadable' })

    const chat = mount()
    await flushMicrotasks()

    expect(chat.shadowRoot?.childElementCount).toBeGreaterThan(0)
  })

  it('stays empty when availability resolves to unavailable', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel({ availability: 'unavailable' })

    const chat = mount()
    await flushMicrotasks()

    expect(chat.shadowRoot?.childElementCount).toBe(0)
  })
})
