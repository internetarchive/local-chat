import { afterEach, describe, expect, it } from 'vitest'
import { flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('colorScheme', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('defaults to undefined when the color-scheme attribute is unset', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    expect(chat.colorScheme).toBeUndefined()
  })

  it('reads the color-scheme attribute set directly on the element', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('color-scheme', 'dark')
    await flushMicrotasks()

    expect(chat.colorScheme).toBe('dark')
  })

  it('treats an unrecognized attribute value as unset', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('color-scheme', 'banana')
    await flushMicrotasks()

    expect(chat.colorScheme).toBeUndefined()
  })

  it('setting the .colorScheme property reflects it onto the attribute, so CSS attribute selectors can see it', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    chat.colorScheme = 'dark'
    expect(chat.getAttribute('color-scheme')).toBe('dark')
    expect(chat.colorScheme).toBe('dark')

    chat.colorScheme = 'light'
    expect(chat.getAttribute('color-scheme')).toBe('light')
  })

  it('setting .colorScheme to undefined removes the attribute, reverting to following prefers-color-scheme', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('color-scheme', 'dark')
    await flushMicrotasks()

    chat.colorScheme = undefined
    expect(chat.hasAttribute('color-scheme')).toBe(false)
    expect(chat.colorScheme).toBeUndefined()
  })

  it('the stylesheet auto-switches themed colors via prefers-color-scheme, unless color-scheme is explicitly set', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const style = chat.shadowRoot?.querySelector('style')
    expect(style?.textContent).toContain('prefers-color-scheme: dark')
    expect(style?.textContent).toContain(':host(:not([color-scheme]))')
    expect(style?.textContent).toContain('[color-scheme="dark"]')
  })

  it('the stylesheet gives every themed color property a private light/dark default, never defining the public property itself', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const style = chat.shadowRoot?.querySelector('style')
    expect(style?.textContent).toContain('var(--local-chat-background, var(--_local-chat-background))')
    expect(style?.textContent).not.toMatch(/:host\s*\{[^}]*--local-chat-background:/)
  })

  it('exposes a shadow-color custom property, replacing the previously-hardcoded box-shadow colors', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const style = chat.shadowRoot?.querySelector('style')
    expect(style?.textContent).toContain('var(--local-chat-shadow-color, var(--_local-chat-shadow-color))')
  })
})
