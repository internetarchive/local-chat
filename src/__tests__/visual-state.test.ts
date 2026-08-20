import { afterEach, describe, expect, it, vi } from 'vitest'
import { readVisualState, writeVisualState } from '../visual-state.js'

describe('Visual state storage', () => {
  afterEach(() => {
    sessionStorage.clear()
  })

  it('returns an empty object when nothing has been persisted yet', () => {
    expect(readVisualState('test-key')).toEqual({})
  })

  it('round-trips a single written field', () => {
    writeVisualState('test-key', { collapsed: false })
    expect(readVisualState('test-key')).toEqual({ collapsed: false })
  })

  it('merges a later write with fields already persisted, without clobbering them', () => {
    writeVisualState('test-key', { collapsed: false })
    writeVisualState('test-key', { panelSize: { width: '400px', height: '500px' } })

    expect(readVisualState('test-key')).toEqual({
      collapsed: false,
      panelSize: { width: '400px', height: '500px' },
    })
  })

  it('isolates different storage-key scopes from each other', () => {
    writeVisualState('scope-a', { collapsed: true })
    writeVisualState('scope-b', { collapsed: false })

    expect(readVisualState('scope-a')).toEqual({ collapsed: true })
    expect(readVisualState('scope-b')).toEqual({ collapsed: false })
  })

  it('namespaces every stored entry under a fixed internal prefix, separate from History', () => {
    writeVisualState('my-custom-key', { collapsed: true })

    const rawKeys = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i))
    expect(rawKeys).not.toContain('my-custom-key')
    expect(rawKeys.some((key) => key?.includes('my-custom-key'))).toBe(true)
    expect(rawKeys.every((key) => key?.startsWith('local-chat:visual-state:'))).toBe(true)
  })

  it('treats unparseable stored data as nothing persisted', () => {
    sessionStorage.setItem('local-chat:visual-state:test-key', 'not valid json{{{')
    expect(readVisualState('test-key')).toEqual({})
  })

  it('treats a mismatched schema version as nothing persisted', () => {
    sessionStorage.setItem('local-chat:visual-state:test-key', JSON.stringify({ version: 999, state: { collapsed: true } }))
    expect(readVisualState('test-key')).toEqual({})
  })

  it('does not throw when sessionStorage.setItem throws (e.g. quota exceeded)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => writeVisualState('test-key', { collapsed: true })).not.toThrow()
    spy.mockRestore()
  })

  it('does not throw when sessionStorage.getItem throws (e.g. blocked by privacy mode)', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })
    expect(() => readVisualState('test-key')).not.toThrow()
    expect(readVisualState('test-key')).toEqual({})
    spy.mockRestore()
  })
})
