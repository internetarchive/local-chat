import { afterEach, describe, expect, it } from 'vitest'
import { resolveStorageScope } from '../storage-scope.js'

function navigateTo(path: string): void {
  window.history.pushState({}, '', path)
}

describe('resolveStorageScope', () => {
  afterEach(() => {
    navigateTo('/')
  })

  it('"origin" resolves to a fixed constant, independent of the current URL', () => {
    navigateTo('/some/page?x=1')
    expect(resolveStorageScope('origin')).toBe(resolveStorageScope('origin'))
    navigateTo('/other/page?y=2')
    const second = resolveStorageScope('origin')
    navigateTo('/some/page?x=1')
    expect(resolveStorageScope('origin')).toBe(second)
  })

  it('"path" resolves to location.pathname, ignoring the query string', () => {
    navigateTo('/docs/guide?tab=2')
    const withQuery = resolveStorageScope('path')
    navigateTo('/docs/guide?tab=3')
    expect(resolveStorageScope('path')).toBe(withQuery)

    navigateTo('/docs/other')
    expect(resolveStorageScope('path')).not.toBe(withQuery)
  })

  it('"url" (default) resolves to pathname + search, distinguishing query-string variations', () => {
    navigateTo('/docs/guide?tab=2')
    const first = resolveStorageScope('url')
    navigateTo('/docs/guide?tab=3')
    const second = resolveStorageScope('url')
    expect(second).not.toBe(first)
  })

  it('ignores the hash when resolving "url"', () => {
    navigateTo('/docs/guide?tab=2#section-1')
    const withHash = resolveStorageScope('url')
    navigateTo('/docs/guide?tab=2#section-2')
    expect(resolveStorageScope('url')).toBe(withHash)
  })

  it('any other literal value is used verbatim', () => {
    expect(resolveStorageScope('my-custom-key')).toBe('my-custom-key')
  })
})
