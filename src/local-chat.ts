import { getLanguageModel, type LanguageModelMessage, type LanguageModelSession } from './language-model.js'

const WIDGET_STYLES = `
  :host {
    all: initial;
    position: fixed;
    inset-inline-end: 1.5rem;
    inset-block-end: 1.5rem;
    font-family: system-ui, sans-serif;
    z-index: 2147483000;
  }
`

const DEFAULT_INSTRUCTIONS =
  'You are a helpful assistant. Answer the question using only the provided context. ' +
  "If the context doesn't cover what's being asked, say so plainly instead of guessing."

function coerceToText(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}

export class LocalChat extends HTMLElement {
  static readonly tagName = 'local-chat'

  #root: ShadowRoot
  #toggleButton: HTMLButtonElement | undefined
  #panel: HTMLDivElement | undefined

  constructor() {
    super()
    this.#root = this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    void this.#checkAvailabilityAndRender()
  }

  async #checkAvailabilityAndRender(): Promise<void> {
    const LM = getLanguageModel()
    if (!LM) return
    const availability = await LM.availability()
    if (availability === 'unavailable') return
    this.#renderWidget()
  }

  #renderWidget(): void {
    const style = document.createElement('style')
    style.textContent = WIDGET_STYLES
    this.#root.appendChild(style)

    this.#toggleButton = document.createElement('button')
    this.#toggleButton.setAttribute('part', 'toggle')
    this.#toggleButton.setAttribute('aria-label', 'Open chat')
    this.#toggleButton.textContent = '💬'
    this.#toggleButton.addEventListener('click', () => this.#setCollapsed(false))
    this.#root.appendChild(this.#toggleButton)

    this.#panel = document.createElement('div')
    this.#panel.setAttribute('part', 'panel')
    this.#root.appendChild(this.#panel)

    const closeButton = document.createElement('button')
    closeButton.setAttribute('part', 'panel-close')
    closeButton.setAttribute('aria-label', 'Collapse chat')
    closeButton.textContent = '×'
    closeButton.addEventListener('click', () => this.#setCollapsed(true))
    this.#panel.appendChild(closeButton)

    this.#setCollapsed(this.getAttribute('collapsed') !== 'false')
  }

  #setCollapsed(collapsed: boolean): void {
    if (this.#toggleButton) this.#toggleButton.hidden = !collapsed
    if (this.#panel) this.#panel.hidden = collapsed
    if (!collapsed) void this.#establishParentSession()
  }

  #instructionsOverride: string | undefined
  #hasInstructionsOverride = false

  get instructions(): string {
    if (this.#hasInstructionsOverride && this.#instructionsOverride !== undefined) return this.#instructionsOverride
    return this.getAttribute('instructions') ?? DEFAULT_INSTRUCTIONS
  }

  set instructions(value: string) {
    this.#instructionsOverride = value
    this.#hasInstructionsOverride = true
  }

  #contextOverride: string | undefined
  #hasContextOverride = false

  get context(): string {
    if (this.#hasContextOverride && this.#contextOverride !== undefined) return this.#contextOverride
    const attr = this.getAttribute('context')
    return attr === null ? '' : coerceToText(attr)
  }

  set context(value: string) {
    this.#contextOverride = value
    this.#hasContextOverride = true
  }

  #combinedContext(): string {
    const parts: string[] = []
    const selector = this.getAttribute('context-selector')
    if (selector) {
      for (const el of document.querySelectorAll(selector)) {
        const text = (el as HTMLElement).innerText ?? el.textContent ?? ''
        if (text.trim()) parts.push(text.trim())
      }
    }
    if (this.context.trim()) parts.push(this.context.trim())
    return parts.join('\n\n')
  }

  #parentSessionPromise: Promise<LanguageModelSession> | undefined

  #establishParentSession(): Promise<LanguageModelSession> {
    if (!this.#parentSessionPromise) {
      this.#parentSessionPromise = this.#createParentSession()
    }
    return this.#parentSessionPromise
  }

  async #createParentSession(): Promise<LanguageModelSession> {
    const LM = getLanguageModel()
    if (!LM) throw new Error('LanguageModel is not available')
    const initialPrompts: LanguageModelMessage[] = [{ role: 'system', content: this.instructions }]
    const session = await LM.create({ initialPrompts })
    const contextText = this.#combinedContext()
    if (contextText) {
      await session.append([{ role: 'user', content: `Reference context:\n\n${contextText}` }])
    }
    return session
  }
}

customElements.define(LocalChat.tagName, LocalChat)
