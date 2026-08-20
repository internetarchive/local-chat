import { afterEach, describe, expect, it } from 'vitest'
import { flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('maxHistory', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('defaults to 5 when max-history is unset', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    expect(chat.maxHistory).toBe(5)
  })

  it('reads a valid max-history attribute', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('max-history', '10')
    await flushMicrotasks()

    expect(chat.maxHistory).toBe(10)
  })

  it('falls back to the default for a negative or non-numeric value', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('max-history', '-1')
    await flushMicrotasks()
    expect(chat.maxHistory).toBe(5)

    chat.setAttribute('max-history', 'not-a-number')
    expect(chat.maxHistory).toBe(5)
  })

  it('allows 0 to disable History', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('max-history', '0')
    await flushMicrotasks()

    expect(chat.maxHistory).toBe(0)
  })
})

describe('storageKey', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('defaults to "url" when storage-key is unset', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    expect(chat.storageKey).toBe('url')
  })

  it('reads the storage-key attribute verbatim', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('storage-key', 'my-app')
    await flushMicrotasks()

    expect(chat.storageKey).toBe('my-app')
  })
})
