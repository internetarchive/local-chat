import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('Empty message', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('shows the built-in default when neither a Starter nor an Icebreaker exists', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelector('[part="empty-state"]')?.textContent).toContain('runs entirely on your device')
  })

  it('is hidden once a Starter renders', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('starters', 'Summarize this page')
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelector('[part="empty-state"]')?.textContent).toBe('')
  })

  it('is hidden once an Icebreaker renders', async () => {
    const scratchSession = createMockSession({ promptResponse: '["Q1?"]' })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(scratchSession)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel({ parentSession })
    const chat = mount()
    chat.setAttribute('icebreakers', '')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelector('[part="empty-state"]')?.textContent).toBe('')
  })

  it('reads a host-provided empty-message attribute', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('empty-message', 'Ask about our docs')
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelector('[part="empty-state"]')?.textContent).toBe('Ask about our docs')
  })

  it('the .emptyMessage property wins when both attribute and property are set', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('empty-message', 'attribute value')
    chat.emptyMessage = 'property value'
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelector('[part="empty-state"]')?.textContent).toBe('property value')
  })

  it('reappears after Clear when no Starters/Icebreakers are configured', async () => {
    const LM = mockLanguageModel()
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="clear"]')?.click()
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelector('[part="empty-state"]')?.textContent).toContain('runs entirely on your device')
  })

  it('stays hidden after Clear when Starters re-render', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('starters', 'Summarize this page')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="clear"]')?.click()
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelectorAll('[part="starter"]')).toHaveLength(1)
    expect(chat.shadowRoot?.querySelector('[part="empty-state"]')?.textContent).toBe('')
  })

  it('Starters render inside the transcript, not empty-state', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('starters', 'Summarize this page')
    await flushMicrotasks()

    const transcript = chat.shadowRoot?.querySelector('[part="transcript"]')
    expect(transcript?.querySelector('[part="starter"]')).not.toBeNull()
    expect(chat.shadowRoot?.querySelector('[part="empty-state"] [part="starter"]')).toBeNull()
  })
})
