import { afterEach, describe, expect, it } from 'vitest'
import { flushMicrotasks, mockLanguageModel, mount } from './test-helpers.js'

describe('logo attribute/property', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('defaults to the built-in emoji when unset', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector('[part="toggle"]')
    expect(toggle?.textContent).toBe('💬')
  })

  it('overrides the toggle glyph via the logo attribute', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('logo', '🤖')
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector('[part="toggle"]')
    expect(toggle?.textContent).toBe('🤖')
  })

  it('the logo property wins over the attribute', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('logo', '🤖')
    chat.logo = '⭐'
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector('[part="toggle"]')
    expect(toggle?.textContent).toBe('⭐')
  })
})

describe('title', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('defaults to "Local Chat" when title is unset', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    await flushMicrotasks()

    const heading = chat.shadowRoot?.querySelector('[part="title"]')
    expect(heading?.textContent).toBe('Local Chat')
  })

  it('renders the title attribute as a heading in the panel header', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('title', 'Ask Me Anything')
    await flushMicrotasks()

    const heading = chat.shadowRoot?.querySelector('[part="title"]')
    expect(heading?.textContent).toBe('Ask Me Anything')
  })

  it('renders the title property (native, reflected) as a heading too', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.title = 'Ask Me Anything'
    await flushMicrotasks()

    const heading = chat.shadowRoot?.querySelector('[part="title"]')
    expect(heading?.textContent).toBe('Ask Me Anything')
    expect(chat.getAttribute('title')).toBe('Ask Me Anything')
  })
})

describe('header logo', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it('renders the logo in the panel header, right before the title', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('logo', '🤖')
    await flushMicrotasks()

    const header = chat.shadowRoot?.querySelector('[part="panel-header"]')
    const logo = chat.shadowRoot?.querySelector('[part="logo"]')
    const title = chat.shadowRoot?.querySelector('[part="title"]')
    if (!header || !logo || !title) throw new Error('header, logo, or title not found')
    expect(logo.textContent).toBe('🤖')
    expect(logo.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(header.contains(logo)).toBe(true)
  })
})

describe('logo image/SVG sources', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel
  })

  it.each([
    ['an absolute URL', 'https://example.com/logo.png'],
    ['a protocol-relative URL', '//example.com/logo.png'],
    ['a root-relative path', '/assets/logo.svg'],
    ['a relative path', './logo.webp'],
    ['a bare filename with an image extension', 'logo.jpg'],
    ['a data URI', 'data:image/svg+xml;base64,PHN2Zy8+'],
  ])('renders %s as an <img>, on both the toggle and the header logo', async (_label, src) => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('logo', src)
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector('[part="toggle"]')
    const toggleImg = toggle?.querySelector('img')
    expect(toggleImg?.src).toBe(new URL(src, document.baseURI).href)
    expect(toggle?.textContent?.trim()).toBe('')

    const headerLogo = chat.shadowRoot?.querySelector('[part="logo"]')
    const headerImg = headerLogo?.querySelector('img')
    expect(headerImg?.src).toBe(new URL(src, document.baseURI).href)
  })

  it('still renders plain text/emoji as text, not an <img>', async () => {
    ;(globalThis as { LanguageModel?: unknown }).LanguageModel = mockLanguageModel()
    const chat = mount()
    chat.setAttribute('logo', '🤖')
    await flushMicrotasks()

    const toggle = chat.shadowRoot?.querySelector('[part="toggle"]')
    expect(toggle?.querySelector('img')).toBeNull()
    expect(toggle?.textContent).toBe('🤖')
  })
})
