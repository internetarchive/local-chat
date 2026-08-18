import { getLanguageModel, type LanguageModelMessage, type LanguageModelSession } from './language-model.js'
import { renderMarkdownStream } from './markdown.js'

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

function coerceToList(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string')
    if (typeof parsed === 'string') return [parsed]
  } catch {
    // fall through to plain-string handling
  }
  return [raw]
}

export class LocalChat extends HTMLElement {
  static readonly tagName = 'local-chat'

  #root: ShadowRoot
  #toggleButton: HTMLButtonElement | undefined
  #panel: HTMLDivElement | undefined
  #transcript: HTMLDivElement | undefined
  #emptyState: HTMLDivElement | undefined
  #input: HTMLInputElement | undefined

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

    this.#emptyState = document.createElement('div')
    this.#emptyState.setAttribute('part', 'empty-state')
    this.#panel.appendChild(this.#emptyState)
    this.#renderStarters()

    this.#transcript = document.createElement('div')
    this.#transcript.setAttribute('part', 'transcript')
    this.#panel.appendChild(this.#transcript)

    const inputRow = document.createElement('div')
    inputRow.setAttribute('part', 'input-row')
    this.#panel.appendChild(inputRow)

    this.#input = document.createElement('input')
    this.#input.setAttribute('part', 'input')
    this.#input.type = 'text'
    this.#input.setAttribute('aria-label', 'Message')
    this.#input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.#send()
    })
    inputRow.appendChild(this.#input)

    const sendButton = document.createElement('button')
    sendButton.setAttribute('part', 'send')
    sendButton.setAttribute('aria-label', 'Send')
    sendButton.textContent = '➤'
    sendButton.addEventListener('click', () => this.#send())
    inputRow.appendChild(sendButton)

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

  #startersOverride: string | undefined
  #hasStartersOverride = false

  get starters(): string[] {
    if (this.#hasStartersOverride && this.#startersOverride !== undefined) return coerceToList(this.#startersOverride)
    const attr = this.getAttribute('starters')
    return attr === null ? [] : coerceToList(attr)
  }

  set starters(value: string) {
    this.#startersOverride = value
    this.#hasStartersOverride = true
  }

  #renderStarters(): void {
    const container = this.#renderPills('starter', this.starters, (text) => this.#submitText(text))
    this.#emptyState?.appendChild(container)
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
    if (this.hasAttribute('icebreakers')) void this.#generateIcebreakers(session)
    return session
  }

  async #generateIcebreakers(parentSession: LanguageModelSession): Promise<void> {
    const max = this.maxFollowups
    if (max === 0) return
    const scratch = await parentSession.clone()
    const options = await this.#requestSuggestions(
      scratch,
      `Suggest up to ${max} brief opening questions a user might want to ask, based on the available context.`,
      max,
    )
    const container = this.#renderPills('icebreaker', options, (text) => this.#submitText(text))
    this.#emptyState?.appendChild(container)
  }

  #childSessionPromise: Promise<LanguageModelSession> | undefined

  #getOrForkChildSession(): Promise<LanguageModelSession> {
    if (!this.#childSessionPromise) {
      this.#childSessionPromise = this.#establishParentSession().then((parent) => parent.clone())
    }
    return this.#childSessionPromise
  }

  #appendMessageBubble(role: 'user' | 'assistant', text: string): HTMLElement {
    const bubble = document.createElement('div')
    bubble.setAttribute('part', `message message-${role}`)
    bubble.textContent = text
    this.#transcript?.appendChild(bubble)
    return bubble
  }

  get maxFollowups(): number {
    const raw = this.getAttribute('max-followups')
    if (raw === null) return 3
    const parsed = Number.parseInt(raw, 10)
    return Number.isNaN(parsed) || parsed < 0 ? 3 : parsed
  }

  #send(): void {
    const text = this.#input?.value.trim() ?? ''
    if (!text) return
    if (this.#input) this.#input.value = ''
    this.#submitText(text)
  }

  #submitText(text: string): void {
    if (this.#emptyState) this.#emptyState.innerHTML = ''
    void this.#sendMessage(text)
  }

  async #sendMessage(text: string): Promise<void> {
    this.#appendMessageBubble('user', text)
    const bubble = this.#appendMessageBubble('assistant', '')
    const session = await this.#getOrForkChildSession()
    const stream = session.promptStreaming(text, {})
    await renderMarkdownStream(bubble, stream)
    await this.#generateFollowups(session)
  }

  #currentFollowupScratch: LanguageModelSession | undefined

  async #generateFollowups(childSession: LanguageModelSession): Promise<void> {
    const max = this.maxFollowups
    if (max === 0) return
    const scratch = await childSession.clone()
    this.#currentFollowupScratch = scratch
    const options = await this.#requestSuggestions(
      scratch,
      `Suggest up to ${max} brief follow-up questions the user might want to ask next, based on the conversation so far.`,
      max,
    )
    if (this.#currentFollowupScratch !== scratch) return // Superseded while awaiting.
    this.#currentFollowupScratch = undefined
    this.#renderFollowups(options)
  }

  async #requestSuggestions(session: LanguageModelSession, prompt: string, max: number): Promise<string[]> {
    const raw = await session.prompt(prompt, {
      responseConstraint: { type: 'array', items: { type: 'string' }, maxItems: max },
    })
    try {
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
    } catch {
      return []
    }
  }

  #renderFollowups(options: string[]): void {
    const container = this.#renderPills('followup', options, (text) => {
      container?.remove()
      void this.#sendMessage(text)
    })
    this.#transcript?.appendChild(container)
  }

  #renderPills(part: string, options: string[], onClick: (text: string) => void): HTMLDivElement {
    const container = document.createElement('div')
    container.setAttribute('part', `${part}s`)
    for (const option of options) {
      const pill = document.createElement('button')
      pill.setAttribute('part', part)
      pill.textContent = option
      pill.addEventListener('click', () => onClick(option))
      container.appendChild(pill)
    }
    return container
  }
}

customElements.define(LocalChat.tagName, LocalChat)
