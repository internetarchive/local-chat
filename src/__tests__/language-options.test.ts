import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('LanguageModel expectedInputs/expectedOutputs', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
    document.documentElement.lang = ''
  })

  it('declares expectedInputs/expectedOutputs, defaulting to en when no document language is set', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const expectedOptions = {
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    }
    expect(LM.availability).toHaveBeenCalledWith(expectedOptions)
    const createOptions = vi.mocked(LM.create).mock.calls[0]?.[0]
    expect(createOptions).toMatchObject(expectedOptions)
  })

  it('uses the document language when it is one of the models supported languages', async () => {
    document.documentElement.lang = 'es'
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const expectedOptions = {
      expectedInputs: [{ type: 'text', languages: ['es'] }],
      expectedOutputs: [{ type: 'text', languages: ['es'] }],
    }
    expect(LM.availability).toHaveBeenCalledWith(expectedOptions)
    const createOptions = vi.mocked(LM.create).mock.calls[0]?.[0]
    expect(createOptions).toMatchObject(expectedOptions)
  })

  it('falls back to en when the document language is not one of the models supported languages', async () => {
    document.documentElement.lang = 'zh-CN'
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()

    expandWidget(chat)
    await flushMicrotasks()

    const createOptions = vi.mocked(LM.create).mock.calls[0]?.[0]
    expect(createOptions).toMatchObject({
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    })
  })
})
