import { afterEach, describe, expect, it, vi } from 'vitest'
import { appendExchange, clearHistory, readHistory } from '../history.js'

function navigateTo(path: string): void {
  window.history.pushState({}, '', path)
}

describe('History storage', () => {
  afterEach(() => {
    localStorage.clear()
    navigateTo('/')
  })

  it('round-trips an appended Exchange', () => {
    appendExchange('test-key', { user: 'hi', assistant: 'hello' }, 5)
    expect(readHistory('test-key', 5)).toEqual([{ user: 'hi', assistant: 'hello' }])
  })

  it('keeps only the most recent max-history Exchanges, dropping the oldest first', () => {
    appendExchange('test-key', { user: 'one', assistant: 'a1' }, 2)
    appendExchange('test-key', { user: 'two', assistant: 'a2' }, 2)
    appendExchange('test-key', { user: 'three', assistant: 'a3' }, 2)

    expect(readHistory('test-key', 2)).toEqual([
      { user: 'two', assistant: 'a2' },
      { user: 'three', assistant: 'a3' },
    ])
  })

  it('max-history 0 disables reading and writing entirely', () => {
    appendExchange('test-key', { user: 'hi', assistant: 'hello' }, 0)
    expect(readHistory('test-key', 0)).toEqual([])
    // Also confirm nothing was silently written under a different max later.
    expect(readHistory('test-key', 5)).toEqual([])
  })

  it('isolates different storage-key scopes from each other', () => {
    appendExchange('scope-a', { user: 'a', assistant: 'a-reply' }, 5)
    appendExchange('scope-b', { user: 'b', assistant: 'b-reply' }, 5)

    expect(readHistory('scope-a', 5)).toEqual([{ user: 'a', assistant: 'a-reply' }])
    expect(readHistory('scope-b', 5)).toEqual([{ user: 'b', assistant: 'b-reply' }])
  })

  it('namespaces every stored entry under a fixed internal prefix', () => {
    appendExchange('my-custom-key', { user: 'hi', assistant: 'hello' }, 5)

    const rawKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
    expect(rawKeys).not.toContain('my-custom-key')
    expect(rawKeys.some((key) => key?.includes('my-custom-key'))).toBe(true)
    expect(rawKeys.every((key) => key?.startsWith('local-chat:'))).toBe(true)
  })

  it('treats unparseable stored data as no History', () => {
    localStorage.setItem('local-chat:history:test-key', 'not valid json{{{')
    expect(readHistory('test-key', 5)).toEqual([])
  })

  it('treats a mismatched schema version as no History', () => {
    localStorage.setItem('local-chat:history:test-key', JSON.stringify({ version: 999, exchanges: [{ user: 'x', assistant: 'y' }] }))
    expect(readHistory('test-key', 5)).toEqual([])
  })

  it('does not throw when localStorage.setItem throws (e.g. quota exceeded)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => appendExchange('test-key', { user: 'hi', assistant: 'hello' }, 5)).not.toThrow()
    spy.mockRestore()
  })

  it('does not throw when localStorage.getItem throws (e.g. blocked by privacy mode)', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })
    expect(() => readHistory('test-key', 5)).not.toThrow()
    expect(readHistory('test-key', 5)).toEqual([])
    spy.mockRestore()
  })

  it('clearHistory removes the entry for the resolved scope', () => {
    appendExchange('test-key', { user: 'hi', assistant: 'hello' }, 5)
    clearHistory('test-key')
    expect(readHistory('test-key', 5)).toEqual([])
  })
})
