import { afterEach, describe, expect, it } from 'vitest'
import { flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('logo attribute/property', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('defaults to the built-in emoji when unset', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector('[part="toggle"]')
    expect(toggle?.textContent).toBe('💬')
  })

  it('overrides the toggle glyph via the logo attribute', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('logo', '🤖')
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector('[part="toggle"]')
    expect(toggle?.textContent).toBe('🤖')
  })

  it('the logo property wins over the attribute', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('logo', '🤖')
    chat.logo = '⭐'
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector('[part="toggle"]')
    expect(toggle?.textContent).toBe('⭐')
  })
})

describe('title', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('renders no heading when title is unset', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const heading = chat.shadowRoot?.querySelector('[part="title"]')
    expect(heading?.textContent).toBe('')
  })

  it('renders the title attribute as a heading in the panel header', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('title', 'Ask Me Anything')
    await flushMicrotasks()

    const heading = chat.shadowRoot?.querySelector('[part="title"]')
    expect(heading?.textContent).toBe('Ask Me Anything')
  })

  it('renders the title property (native, reflected) as a heading too', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.title = 'Ask Me Anything'
    await flushMicrotasks()

    const heading = chat.shadowRoot?.querySelector('[part="title"]')
    expect(heading?.textContent).toBe('Ask Me Anything')
    expect(chat.getAttribute('title')).toBe('Ask Me Anything')
  })
})
