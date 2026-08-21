import { afterEach, describe, expect, it, vi } from 'vitest'
import { collapseWidget, createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('Parent Session creation', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('does not create a session before the Widget is ever Expanded', async () => {
    const LM = mockLanguageModel()
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    mount()
    await flushMicrotasks()

    expect(LM.create).not.toHaveBeenCalled()
  })

  it('creates the Parent Session on first Expand, primed with default instructions', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    expect(LM.create).toHaveBeenCalledTimes(1)
    const options = vi.mocked(LM.create).mock.calls[0]?.[0]
    expect(options?.initialPrompts).toEqual([{ role: 'system', content: expect.stringContaining('context') }])
  })

  it('uses host-provided instructions instead of the default when set', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.setAttribute('instructions', 'You are a pirate.')
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const options = vi.mocked(LM.create).mock.calls[0]?.[0]
    expect(options?.initialPrompts).toEqual([{ role: 'system', content: 'You are a pirate.' }])
  })

  it('primes the combined context via append when context is set', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.setAttribute('context', 'Some raw context text')
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    expect(parentSession.append).toHaveBeenCalledTimes(1)
    const messages = vi.mocked(parentSession.append).mock.calls[0]?.[0]
    expect(messages?.[0]?.role).toBe('user')
    expect(messages?.[0]?.content).toContain('Some raw context text')
  })

  it('combines context-selector-extracted text with the context attribute', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const doc = document.createElement('div')
    doc.className = 'doc'
    doc.textContent = 'Extracted page text'
    document.body.appendChild(doc)
    const chat = mount()
    chat.setAttribute('context-selector', '.doc')
    chat.setAttribute('context', 'Explicit context')
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const messages = vi.mocked(parentSession.append).mock.calls[0]?.[0]
    expect(messages?.[0]?.content).toContain('Extracted page text')
    expect(messages?.[0]?.content).toContain('Explicit context')
  })

  it('parses a JSON context value instead of treating it as plain text', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.setAttribute('context', '["one", "two"]')
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const messages = vi.mocked(parentSession.append).mock.calls[0]?.[0]
    expect(messages?.[0]?.content).toContain('one')
    expect(messages?.[0]?.content).toContain('two')
  })

  it('the .context property wins when both attribute and property are set', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.setAttribute('context', 'attribute value')
    chat.context = 'property value'
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const messages = vi.mocked(parentSession.append).mock.calls[0]?.[0]
    expect(messages?.[0]?.content).toContain('property value')
    expect(messages?.[0]?.content).not.toContain('attribute value')
  })

  it('accepts an array directly via the .context property, without needing to JSON.stringify it first', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.context = ['one', 'two']
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const messages = vi.mocked(parentSession.append).mock.calls[0]?.[0]
    expect(messages?.[0]?.content).toContain('one')
    expect(messages?.[0]?.content).toContain('two')
  })

  it('accepts an object directly via the .context property', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    chat.context = { topic: 'widgets' }
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const messages = vi.mocked(parentSession.append).mock.calls[0]?.[0]
    expect(messages?.[0]?.content).toContain('topic')
    expect(messages?.[0]?.content).toContain('widgets')
  })

  it('does not create the Parent Session again on a later Expand', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()
    collapseWidget(chat)
    expandWidget(chat)
    await flushMicrotasks()

    expect(LM.create).toHaveBeenCalledTimes(1)
  })
})
