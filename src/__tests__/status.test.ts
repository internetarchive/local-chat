import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LanguageModelAPI, LanguageModelCreateMonitor, LanguageModelSession } from '../language-model.js'
import { createMockSession, expandWidget, flushMicrotasks, mockLanguageModel, mount, sendMessage } from './test-helpers.js'

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('Status bar', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('shows "Starting the chat…" while the Parent Session is being established, clearing once ready', async () => {
    const createDeferred = deferred<LanguageModelSession>()
    const LM: LanguageModelAPI = {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockReturnValue(createDeferred.promise),
    }
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const status = chat.shadowRoot?.querySelector<HTMLElement>('[part="status"]')
    expect(status?.hidden).toBe(false)
    expect(status?.textContent).toContain('Starting the chat')

    createDeferred.resolve(createMockSession())
    await flushMicrotasks()

    expect(status?.hidden).toBe(true)
  })

  it('shows an explanatory message and a download button when the model is downloadable', async () => {
    const parentSession = createMockSession()
    const LM = mockLanguageModel({ availability: 'downloadable', parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    const status = chat.shadowRoot?.querySelector<HTMLElement>('[part="status"]')
    const downloadButton = chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="status-download"]')
    expect(status?.textContent).toContain("isn't installed")
    expect(downloadButton?.hidden).toBe(false)
    expect(LM.create).not.toHaveBeenCalled()

    downloadButton?.click()
    await flushMicrotasks()

    expect(LM.create).toHaveBeenCalled()
    expect(status?.hidden).toBe(true)
  })

  it('reports download progress via the monitor hook after the user clicks download', async () => {
    let progressListener: ((event: { loaded: number }) => void) | undefined
    const LM: LanguageModelAPI = {
      availability: vi.fn().mockResolvedValue('downloadable'),
      create: vi.fn((options) => {
        const monitor: LanguageModelCreateMonitor = {
          addEventListener: (type, listener) => {
            if (type === 'downloadprogress') progressListener = listener
          },
        }
        options?.monitor?.(monitor)
        return Promise.resolve(createMockSession())
      }),
    }
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    chat.shadowRoot?.querySelector<HTMLButtonElement>('[part="status-download"]')?.click()
    await flushMicrotasks()

    progressListener?.({ loaded: 0.42 })

    const status = chat.shadowRoot?.querySelector<HTMLElement>('[part="status"]')
    expect(status?.textContent).toContain('42%')
  })

  it('shows "Thinking…" while a prompt is in flight, clearing once it resolves', async () => {
    const childSession = createMockSession({ promptStreamingChunks: ['Hello'] })
    const parentSession = createMockSession()
    vi.mocked(parentSession.clone).mockResolvedValue(childSession)
    const LM = mockLanguageModel({ parentSession })
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = LM
    const chat = mount()
    await flushMicrotasks()
    expandWidget(chat)
    await flushMicrotasks()

    sendMessage(chat, 'hi')
    await flushMicrotasks()

    const status = chat.shadowRoot?.querySelector<HTMLElement>('[part="status"]')
    expect(status?.hidden).toBe(true)
  })
})
