import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

describe('Follow-ups', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  function setUpChat(followupResponse = '["one?", "two?"]') {
    const scratchSession = createMockSession({ promptResponse: followupResponse })
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    vi.mocked(childSession.clone).mockResolvedValue(scratchSession)
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    return { LM, parentSession, childSession, scratchSession }
  }

  it('forks a Scratch Session from the Child and requests constrained Follow-ups after the reply finishes', async () => {
    const { childSession, scratchSession } = setUpChat()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hello')
    await flushMicrotasks()

    expect(childSession.clone).toHaveBeenCalledTimes(1)
    expect(scratchSession.prompt).toHaveBeenCalledTimes(1)
    const options = vi.mocked(scratchSession.prompt).mock.calls[0]?.[1]
    expect(options?.responseConstraint).toMatchObject({
      type: 'array',
      items: { type: 'string' },
      maxItems: 3,
    })
  })

  it('prompts for context-answerable follow-ups and permits fewer/zero rather than force-filling', async () => {
    const { scratchSession } = setUpChat()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hello')
    await flushMicrotasks()

    const prompt = vi.mocked(scratchSession.prompt).mock.calls[0]?.[0]
    expect(prompt).toContain('context')
    expect(prompt?.toLowerCase()).toMatch(/fewer|empty|zero/)
  })

  it('renders no pills container at all when Follow-up generation returns an empty array', async () => {
    setUpChat('[]')
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hello')
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelector('[part="followups"]')).toBeNull()
  })

  it('renders Follow-ups as clickable pills', async () => {
    setUpChat('["What about X?", "And Y?"]')
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hello')
    await flushMicrotasks()

    const pills = chat.shadowRoot?.querySelectorAll('[part="followup"]')
    expect(pills).toHaveLength(2)
    expect(pills?.[0]?.textContent).toBe('What about X?')
  })

  it('clicking a Follow-up pill sends it as the next message on the Child Session', async () => {
    const { childSession } = setUpChat('["What about X?"]')
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hello')
    await flushMicrotasks()

    const pill = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="followup"]')
    pill?.click()
    await flushMicrotasks()

    expect(childSession.promptStreaming).toHaveBeenCalledTimes(2)
    expect(childSession.promptStreaming).toHaveBeenLastCalledWith('What about X?', expect.anything())
  })

  it('focuses the input after clicking a Follow-up pill', async () => {
    setUpChat('["What about X?"]')
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hello')
    await flushMicrotasks()

    const input = chat.shadowRoot?.querySelector('[part="input"]')
    const pill = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="followup"]')
    // Simulate the pill actually having focus, as a real browser's default
    // click behavior on a button would leave it -- jsdom's .click() doesn't
    // do this itself, so without this the test can't tell the fix apart.
    pill?.focus()
    pill?.click()
    await flushMicrotasks()

    expect(chat.shadowRoot?.activeElement).toBe(input)
  })

  it('removes stale Follow-up pills when the next message is typed instead of a pill being clicked', async () => {
    setUpChat('["What about X?"]')
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hello')
    await flushMicrotasks()
    expect(chat.shadowRoot?.querySelectorAll('[part="followups"]')).toHaveLength(1)

    sendMessage(chat, 'a manually typed follow-up, not a pill click')
    await flushMicrotasks()

    // The first round's pills should be gone, not left dangling alongside the
    // second round's freshly-generated ones.
    expect(chat.shadowRoot?.querySelectorAll('[part="followups"]')).toHaveLength(1)
  })

  it('caps the requested count via max-followups', async () => {
    const { scratchSession } = setUpChat()
    const chat = mount()
    chat.setAttribute('max-followups', '5')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hello')
    await flushMicrotasks()

    const options = vi.mocked(scratchSession.prompt).mock.calls[0]?.[1]
    expect(options?.responseConstraint).toMatchObject({ maxItems: 5 })
  })

  it('does not generate Follow-ups when max-followups is 0', async () => {
    const { childSession } = setUpChat()
    const chat = mount()
    chat.setAttribute('max-followups', '0')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hello')
    await flushMicrotasks()

    expect(childSession.clone).not.toHaveBeenCalled()
  })
})
