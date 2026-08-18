import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LanguageModelAPI, LanguageModelSession } from '../language-model.js'
import { expandWidget, flushMicrotasks, mount } from './test-helpers.js'

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function emptySession(): LanguageModelSession {
  return {
    prompt: vi.fn().mockResolvedValue(''),
    promptStreaming: vi.fn(
      () =>
        new ReadableStream<string>({
          start(controller) {
            controller.enqueue('ok')
            controller.close()
          },
        }),
    ),
    append: vi.fn().mockResolvedValue(undefined),
    clone: vi.fn(async () => emptySession()),
    destroy: vi.fn(),
  }
}

describe('Icebreakers racing an early Starter click', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('discards Icebreakers that resolve after the user already started the conversation via a Starter', async () => {
    const icebreakerPromptDeferred = deferred<string>()
    const icebreakerScratch: LanguageModelSession = {
      prompt: vi.fn().mockReturnValue(icebreakerPromptDeferred.promise),
      promptStreaming: vi.fn(),
      append: vi.fn().mockResolvedValue(undefined),
      clone: vi.fn(),
      destroy: vi.fn(),
    }
    const childSession = emptySession()
    const parentSession: LanguageModelSession = {
      prompt: vi.fn().mockResolvedValue(''),
      promptStreaming: vi.fn(),
      append: vi.fn().mockResolvedValue(undefined),
      clone: vi.fn().mockResolvedValueOnce(icebreakerScratch).mockResolvedValue(childSession),
      destroy: vi.fn(),
    }
    const LM: LanguageModelAPI = {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue(parentSession),
    }
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM

    const chat = mount()
    chat.setAttribute('icebreakers', '')
    chat.setAttribute('starters', '["Say hi"]')
    await flushMicrotasks() // Widget shell (incl. Starters, declarative) renders.
    expandWidget(chat)
    // Click the Starter immediately -- before Parent Session setup has even
    // progressed far enough to kick off Icebreaker generation. Starters render
    // synchronously and unconditionally, so a real user can plausibly click one
    // this early, well before the model has even loaded.
    chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="starter"]')?.click()
    await flushMicrotasks() // Parent Session now created; Icebreaker generation kicked off, prompt() still pending.

    // Icebreaker generation finally resolves, well after the conversation started.
    icebreakerPromptDeferred.resolve('["Too late"]')
    await flushMicrotasks()

    const emptyState = chat.shadowRoot?.querySelector('[part="empty-state"]')
    expect(emptyState?.querySelectorAll('[part="icebreaker"]').length).toBe(0)
  })
})
