import { afterEach, describe, expect, it } from 'vitest'
import { appendExchange } from '../history.js'
import { collapseWidget, createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('Restoring History on first Expand', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
    localStorage.clear()
  })

  it('renders restored Exchanges into the transcript immediately on first Expand', async () => {
    appendExchange('url', { user: 'What is this?', assistant: 'A **test** answer.' }, 5)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const transcript = chat.shadowRoot?.querySelector('[part="transcript"]')
    const userBubble = transcript?.querySelector('[part~="message-user"]')
    const assistantBubble = transcript?.querySelector('[part~="message-assistant"]')
    expect(userBubble?.textContent).toBe('What is this?')
    expect(assistantBubble?.innerHTML).toContain('<strong>test</strong>')
  })

  it('renders multiple restored Exchanges in order', async () => {
    appendExchange('url', { user: 'first question', assistant: 'first answer' }, 5)
    appendExchange('url', { user: 'second question', assistant: 'second answer' }, 5)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const transcript = chat.shadowRoot?.querySelector('[part="transcript"]')
    const userBubbles = transcript?.querySelectorAll('[part~="message-user"]')
    expect(userBubbles).toHaveLength(2)
    expect(userBubbles?.[0]?.textContent).toBe('first question')
    expect(userBubbles?.[1]?.textContent).toBe('second question')
  })

  it('suppresses Starters when History is restored', async () => {
    appendExchange('url', { user: 'q', assistant: 'a' }, 5)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('starters', 'Say hi')
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelector('[part="starter"]')).toBeNull()
  })

  it('suppresses Icebreaker generation when History is restored', async () => {
    appendExchange('url', { user: 'q', assistant: 'a' }, 5)
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.setAttribute('icebreakers', '')
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    // The eager Child Session fork (ADR-0005) clones the Parent Session once
    // to prime it with restored History -- but Icebreaker generation's own,
    // separate clone (for its scratch session) must never happen, so the
    // total stays at exactly one, and no icebreaker pill gets rendered.
    expect(parentSession.clone).toHaveBeenCalledTimes(1)
    expect(chat.shadowRoot?.querySelector('[part="icebreaker"]')).toBeNull()
  })

  it('does nothing when there is no History to restore', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const transcript = chat.shadowRoot?.querySelector('[part="transcript"]')
    expect(transcript?.children).toHaveLength(0)
  })

  it('does not restore again when the Widget collapses and re-expands', async () => {
    appendExchange('url', { user: 'q', assistant: 'a' }, 5)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()
    collapseWidget(chat)
    expandWidget(chat)
    await flushMicrotasks()

    const transcript = chat.shadowRoot?.querySelector('[part="transcript"]')
    expect(transcript?.querySelectorAll('[part~="message-user"]')).toHaveLength(1)
  })

  it('does not restore anything when max-history is 0, even if storage has data', async () => {
    appendExchange('url', { user: 'q', assistant: 'a' }, 5)
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('max-history', '0')
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const transcript = chat.shadowRoot?.querySelector('[part="transcript"]')
    expect(transcript?.children).toHaveLength(0)
  })
})
