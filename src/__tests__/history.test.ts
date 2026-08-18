import { afterEach, describe, expect, it, vi } from 'vitest'
import { appendExchange, clearHistory, readHistory, resolveHistoryKey } from '../history.js'

function navigateTo(path: string): void {
  window.history.pushState({}, '', path)
}

describe('resolveHistoryKey', () => {
  afterEach(() => {
    navigateTo('/')
  })

  it('"origin" resolves to a fixed constant, independent of the current URL', () => {
    navigateTo('/some/page?x=1')
    expect(resolveHistoryKey('origin')).toBe(resolveHistoryKey('origin'))
    navigateTo('/other/page?y=2')
    const second = resolveHistoryKey('origin')
    navigateTo('/some/page?x=1')
    expect(resolveHistoryKey('origin')).toBe(second)
  })

  it('"path" resolves to location.pathname, ignoring the query string', () => {
    navigateTo('/docs/guide?tab=2')
    const withQuery = resolveHistoryKey('path')
    navigateTo('/docs/guide?tab=3')
    expect(resolveHistoryKey('path')).toBe(withQuery)

    navigateTo('/docs/other')
    expect(resolveHistoryKey('path')).not.toBe(withQuery)
  })

  it('"url" (default) resolves to pathname + search, distinguishing query-string variations', () => {
    navigateTo('/docs/guide?tab=2')
    const first = resolveHistoryKey('url')
    navigateTo('/docs/guide?tab=3')
    const second = resolveHistoryKey('url')
    expect(second).not.toBe(first)
  })

  it('ignores the hash when resolving "url"', () => {
    navigateTo('/docs/guide?tab=2#section-1')
    const withHash = resolveHistoryKey('url')
    navigateTo('/docs/guide?tab=2#section-2')
    expect(resolveHistoryKey('url')).toBe(withHash)
  })

  it('any other literal value is used verbatim', () => {
    expect(resolveHistoryKey('my-custom-key')).toBe('my-custom-key')
  })
})

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

  it('isolates different history-key scopes from each other', () => {
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
