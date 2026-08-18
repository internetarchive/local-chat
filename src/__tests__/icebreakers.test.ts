import { afterEach, describe, expect, it, vi } from 'vitest'
import { collapseWidget, createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('Icebreakers', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  function setUpChat(icebreakerResponse = '["Q1?", "Q2?"]') {
    const scratchSession = createMockSession({ promptResponse: icebreakerResponse })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(scratchSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    return { LM, parentSession, scratchSession }
  }

  it('does not generate Icebreakers when the attribute is absent', async () => {
    const { parentSession } = setUpChat()
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    expect(parentSession.clone).not.toHaveBeenCalled()
  })

  it('generates Icebreakers via a Scratch Session cloned from Parent when set', async () => {
    const { parentSession, scratchSession } = setUpChat()
    const chat = mount()
    chat.setAttribute('icebreakers', '')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    expect(parentSession.clone).toHaveBeenCalledTimes(1)
    expect(scratchSession.prompt).toHaveBeenCalledTimes(1)
    const options = vi.mocked(scratchSession.prompt).mock.calls[0]?.[1]
    expect(options?.responseConstraint).toMatchObject({ type: 'array', items: { type: 'string' }, maxItems: 3 })
  })

  it('prompts for context-answerable questions, not meta questions about the assistant, and permits fewer/zero', async () => {
    const { scratchSession } = setUpChat()
    const chat = mount()
    chat.setAttribute('icebreakers', '')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const prompt = vi.mocked(scratchSession.prompt).mock.calls[0]?.[0]
    expect(prompt).toContain('context')
    expect(prompt?.toLowerCase()).toMatch(/assistant|chatbot|chat widget|itself/)
    expect(prompt?.toLowerCase()).toMatch(/fewer|empty|zero/)
  })

  it('renders no pills container at all when Icebreaker generation returns an empty array', async () => {
    setUpChat('[]')
    const chat = mount()
    chat.setAttribute('icebreakers', '')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    expect(chat.shadowRoot?.querySelector('[part="icebreakers"]')).toBeNull()
  })

  it('renders Icebreakers as clickable pills in the empty Conversation view', async () => {
    setUpChat('["Q1?", "Q2?"]')
    const chat = mount()
    chat.setAttribute('icebreakers', '')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const pills = chat.shadowRoot?.querySelectorAll('[part="icebreaker"]')
    expect(pills).toHaveLength(2)
    expect(pills?.[0]?.textContent).toBe('Q1?')
  })

  it('clicking an Icebreaker sends it as the first message', async () => {
    const { parentSession, scratchSession } = setUpChat('["Q1?"]')
    const childSession = createMockSession({ promptStreamingChunks: ['reply'] })
    vi.mocked(parentSession.clone).mockImplementation(async (): Promise<ReturnType<typeof createMockSession>> => {
      // First clone() call is the icebreaker Scratch Session, the second is the real Child Session.
      return vi.mocked(parentSession.clone).mock.calls.length === 1 ? scratchSession : childSession
    })
    const chat = mount()
    chat.setAttribute('icebreakers', '')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const pill = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="icebreaker"]')
    pill?.click()
    await flushMicrotasks()

    expect(childSession.promptStreaming).toHaveBeenCalledWith('Q1?', expect.anything())
  })

  it('has no effect when max-followups is 0', async () => {
    const { parentSession } = setUpChat()
    const chat = mount()
    chat.setAttribute('icebreakers', '')
    chat.setAttribute('max-followups', '0')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    expect(parentSession.clone).not.toHaveBeenCalled()
  })

  it('does not regenerate Icebreakers on a later Expand', async () => {
    const { parentSession } = setUpChat()
    const chat = mount()
    chat.setAttribute('icebreakers', '')
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()
    collapseWidget(chat)
    expandWidget(chat)
    await flushMicrotasks()

    expect(parentSession.clone).toHaveBeenCalledTimes(1)
  })
})
