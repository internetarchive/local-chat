import { appendExchange, clearHistory, type Exchange, readHistory } from './history.js'
import { getLanguageModel, type LanguageModelAPI, type LanguageModelMessage, type LanguageModelSession } from './language-model.js'
import { renderCompleteMarkdown, renderMarkdownStream } from './markdown.js'

const WIDGET_STYLES = `
  :host {
    all: initial;
    font-family: var(--local-chat-font-family, system-ui, sans-serif);
    font-size: var(--local-chat-font-size, 0.9rem);
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  [hidden] {
    /* Parts below declare their own \`display\` for their visible state, which --
       per the CSS cascade -- would otherwise always beat the UA stylesheet's
       [hidden] { display: none } regardless of selector specificity, since normal
       author declarations always win over normal user-agent declarations. */
    display: none !important;
  }
  /* The toggle and panel each get their own independent fixed position --
     dragging one never affects the other's remembered position, unlike a
     single position shared between them (which forced anchor-edge-flipping
     and viewport-clamping heuristics just to keep a wildly differently-sized
     sibling from ending up somewhere nonsensical on every Collapse/Expand). */
  [part="toggle"],
  [part="panel"] {
    position: fixed;
    inset-inline-end: 1.5rem;
    inset-block-end: 1.5rem;
    z-index: 2147483000;
  }
  [part="toggle"] {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border-radius: 50%;
    border: none;
    background: var(--local-chat-accent, #2563eb);
    color: var(--local-chat-accent-color, #fff);
    font-size: 1.4rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }
  [part="toggle"] img {
    width: 1.6rem;
    height: 1.6rem;
    object-fit: contain;
  }
  [part="panel"] {
    display: flex;
    flex-direction: column;
    width: 22rem;
    height: 28rem;
    min-width: 16rem;
    min-height: 12rem;
    max-width: 90vw;
    max-height: 90vh;
    overflow: hidden;
    box-sizing: border-box;
    background: var(--local-chat-background, #fff);
    color: var(--local-chat-color, #111);
    border: 1px solid var(--local-chat-border-color, #ccc);
    border-radius: var(--local-chat-radius, 0.5rem);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }
  [part="resize-handle"] {
    position: absolute;
    top: 0.35rem;
    left: 0.35rem;
    width: 0.6rem;
    height: 0.6rem;
    border-top: 2px solid var(--local-chat-border-color, #ccc);
    border-left: 2px solid var(--local-chat-border-color, #ccc);
    cursor: nwse-resize;
    touch-action: none;
  }
  [part="panel-header"] {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.4em;
    padding: 0.5em;
    /* Extra clearance so the logo doesn't touch the resize handle, which sits
       independently positioned at the panel's top-left corner. */
    padding-inline-start: 1.5rem;
    cursor: move;
    touch-action: none;
    user-select: none;
    border-bottom: 1px solid var(--local-chat-border-color, #ccc);
  }
  [part="logo"] {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    font-size: 1.1em;
    line-height: 1;
  }
  [part="logo"] img {
    width: 1.2em;
    height: 1.2em;
    object-fit: contain;
  }
  [part="title"] {
    flex: 1;
    min-width: 0;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  [part="clear"],
  [part="panel-close"] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.8em;
    height: 1.8em;
    overflow: hidden;
    border: 1px solid var(--local-chat-border-color, #ccc);
    background: none;
    color: inherit;
    border-radius: 0.3em;
    padding: 0;
  }
  [part="empty-state"]:empty {
    display: none;
  }
  [part="empty-state"] {
    padding: 0.5em;
  }
  [part="transcript"] {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    padding: 0.5em;
  }
  [part~="message"] {
    display: inline-block;
    max-width: 85%;
    margin-block: 0.3em;
    padding: 0.5em 0.75em;
    border-radius: 0.7em;
    overflow-wrap: break-word;
  }
  [part~="message"]:empty {
    /* The assistant bubble is appended empty, before any content has
       streamed in -- and could stay empty if the response genuinely turns
       out that way. Either way, an empty bubble is just a stray padded box
       with nothing in it, so it stays hidden until it actually has content. */
    display: none;
  }
  [part~="message"] > :first-child {
    /* The markdown renderer wraps content in block elements (p, ul, ...)
       that carry their own UA-default margin -- left in place, that stacks
       on top of this bubble's own padding, making assistant replies look
       more padded than the plain-text user bubble. Only the outer edges are
       collapsed here; margins between multiple blocks in one reply (e.g.
       two paragraphs) are left alone. */
    margin-top: 0;
  }
  [part~="message"] > :last-child {
    margin-bottom: 0;
  }
  [part~="message"] pre {
    /* pre preserves whitespace/doesn't wrap by default, so a long line would
       otherwise widen the bubble -- and since the transcript sets overflow-y
       without overflow-x, an overlong box here made the whole transcript
       scroll horizontally too (per the CSS overflow spec, a non-"visible"
       value on one axis computes "visible" on the other as "auto" instead).
       Confining the scroll to the code block itself keeps that contained. */
    max-width: 100%;
    overflow-x: auto;
    box-sizing: border-box;
    background: var(--local-chat-code-background, #e5e5e5);
    padding: 0.6em 0.75em;
    border-radius: 0.4em;
  }
  [part~="message"] code {
    /* Matches pre's own background -- applying it here too (rather than
       only to inline code, i.e. code outside pre) is harmless: a pre block's
       own code child just gets painted the same color on top of pre's
       already-matching background, with no visible difference. Padding/
       radius here are for inline code specifically; reset back to 0 for
       code inside pre just below, since pre already provides its own. */
    background: var(--local-chat-code-background, #e5e5e5);
    padding: 0 0.15em;
    border-radius: 0.25em;
  }
  [part~="message"] pre code {
    padding: 0;
    border-radius: 0;
  }
  [part~="message-user"] {
    display: block;
    margin-inline-start: auto;
    background: var(--local-chat-accent, #2563eb);
    color: var(--local-chat-accent-color, #fff);
  }
  [part~="message-assistant"] {
    display: block;
    margin-inline-end: auto;
    background: var(--local-chat-assistant-background, #f0f0f0);
  }
  [part="starters"],
  [part="icebreakers"],
  [part="followups"] {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4em;
    padding: 0.5em;
  }
  [part="starter"],
  [part="icebreaker"],
  [part="followup"] {
    border: 1px solid var(--local-chat-accent, #2563eb);
    background: none;
    color: var(--local-chat-accent, #2563eb);
    border-radius: 1em;
    padding: 0.3em 0.8em;
    font-size: 0.85em;
    text-align: start;
  }
  [part="status"] {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.4em 0.6em;
    font-size: 0.8em;
    color: var(--local-chat-status-color, #777);
    border-top: 1px solid var(--local-chat-border-color, #ccc);
  }
  [part="status-download"] {
    flex-shrink: 0;
    border: 1px solid var(--local-chat-accent, #2563eb);
    background: none;
    color: var(--local-chat-accent, #2563eb);
    border-radius: 0.3em;
    padding: 0.15em 0.5em;
    font: inherit;
  }
  [part="input-row"] {
    display: flex;
    align-items: flex-end;
    gap: 0.4em;
    padding: 0.5em;
    border-top: 1px solid var(--local-chat-border-color, #ccc);
  }
  [part="input"] {
    flex: 1;
    box-sizing: border-box;
    border: 1px solid var(--local-chat-border-color, #ccc);
    border-radius: 0.3em;
    padding: 0.4em 0.6em;
    font: inherit;
    color: inherit;
    background: var(--local-chat-background, #fff);
    resize: none;
    max-height: 8em;
    overflow-y: auto;
  }
  [part="send"] {
    border: none;
    background: var(--local-chat-accent, #2563eb);
    color: var(--local-chat-accent-color, #fff);
    border-radius: 0.3em;
    padding: 0.4em 0.8em;
  }
`

const DEFAULT_INSTRUCTIONS =
  'You are a helpful assistant. Answer the question using only the provided context. ' +
  "If the context doesn't cover what's being asked, say so plainly instead of guessing."

const DEFAULT_LOGO = '💬'
const DEFAULT_TITLE = 'Local Chat'
const DEFAULT_EMPTY_MESSAGE = 'Ask me anything -- this chat runs entirely on your device, powered by built-in AI.'

const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|gif|svg|webp|avif)$/i

const SUPPORTED_MODEL_LANGUAGES = ['de', 'en', 'es', 'fr', 'ja']

function detectModelLanguage(): string {
  const lang = document.documentElement.lang.split('-')[0]?.toLowerCase()
  return lang && SUPPORTED_MODEL_LANGUAGES.includes(lang) ? lang : 'en'
}

function languageModelOptions(): {
  expectedInputs: Array<{ type: 'text'; languages: string[] }>
  expectedOutputs: Array<{ type: 'text'; languages: string[] }>
} {
  const languages = [detectModelLanguage()]
  return {
    expectedInputs: [{ type: 'text', languages }],
    expectedOutputs: [{ type: 'text', languages }],
  }
}

function looksLikeImageSource(value: string): boolean {
  if (value.startsWith('data:image/')) return true
  if (value.startsWith('//')) return true
  if (/^https?:\/\//i.test(value)) return true
  if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) return true
  return IMAGE_EXTENSION_PATTERN.test(value)
}

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
  #input: HTMLTextAreaElement | undefined
  #statusEl: HTMLDivElement | undefined
  #statusText: HTMLSpanElement | undefined
  #statusDownloadButton: HTMLButtonElement | undefined

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
    const availability = await LM.availability(languageModelOptions())
    if (availability === 'unavailable') return
    this.#renderWidget()
  }

  #renderWidget(): void {
    const style = document.createElement('style')
    style.textContent = WIDGET_STYLES
    this.#root.appendChild(style)

    if (!this.hasAttribute('hide-toggle')) {
      this.#toggleButton = document.createElement('button')
      this.#toggleButton.setAttribute('part', 'toggle')
      this.#toggleButton.setAttribute('aria-label', 'Open chat')
      this.#toggleButton.title = this.title || DEFAULT_TITLE
      this.#renderLogoInto(this.#toggleButton)
      this.#makeDraggable(this.#toggleButton, this.#toggleButton, () => this.#setCollapsed(false))
      this.#root.appendChild(this.#toggleButton)
    }

    const triggerSelector = this.getAttribute('trigger-selector')
    if (triggerSelector) {
      for (const trigger of document.querySelectorAll(triggerSelector)) {
        trigger.addEventListener('click', () => this.toggle())
      }
    }

    this.#panel = document.createElement('div')
    this.#panel.setAttribute('part', 'panel')
    this.#panel.tabIndex = -1
    // Without this, the panel's contents (transcript, input, message bubbles,
    // etc.) would inherit the host element's own title attribute as their
    // tooltip on hover -- that lookup crosses the shadow boundary, and none of
    // them have anything to do with the Widget's title. An explicit empty
    // title breaks that inheritance; the Clear/Close buttons set their own
    // more specific title regardless.
    this.#panel.title = ''
    this.#root.appendChild(this.#panel)

    const resizeHandle = document.createElement('div')
    resizeHandle.setAttribute('part', 'resize-handle')
    resizeHandle.setAttribute('aria-hidden', 'true')
    this.#panel.appendChild(resizeHandle)
    this.#makeResizable(resizeHandle, this.#panel)

    this.#panel.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.#setCollapsed(true)
    })

    // Clicking a non-interactive area (transcript background, a message's
    // text, etc.) doesn't move focus anywhere on its own, which would leave
    // Escape with nothing inside the panel to bubble the keydown through --
    // claim focus onto the panel itself as a fallback. Checked against the
    // actual click target, not the currently focused element -- the input
    // may already be focused (e.g. auto-focused on Expand) when a click
    // lands elsewhere, and that previously-focused element shouldn't count
    // as "focus already landed on something more specific" for this click.
    this.#panel.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, input, textarea')) return
      this.#panel?.focus()
    })

    const header = document.createElement('div')
    header.setAttribute('part', 'panel-header')
    this.#panel.appendChild(header)
    this.#makeDraggable(header, this.#panel)

    const headerLogo = document.createElement('span')
    headerLogo.setAttribute('part', 'logo')
    headerLogo.setAttribute('aria-hidden', 'true')
    this.#renderLogoInto(headerLogo)
    header.appendChild(headerLogo)

    const titleHeading = document.createElement('span')
    titleHeading.setAttribute('part', 'title')
    titleHeading.textContent = this.title || DEFAULT_TITLE
    header.appendChild(titleHeading)

    const clearButton = document.createElement('button')
    clearButton.setAttribute('part', 'clear')
    clearButton.setAttribute('aria-label', 'Clear conversation')
    clearButton.title = 'Clear conversation'
    clearButton.textContent = '🗑️'
    clearButton.addEventListener('click', () => this.#clear())
    header.appendChild(clearButton)

    const closeButton = document.createElement('button')
    closeButton.setAttribute('part', 'panel-close')
    closeButton.setAttribute('aria-label', 'Collapse chat')
    closeButton.title = 'Collapse chat'
    closeButton.textContent = '×'
    closeButton.addEventListener('click', () => this.#setCollapsed(true))
    header.appendChild(closeButton)

    this.#emptyState = document.createElement('div')
    this.#emptyState.setAttribute('part', 'empty-state')
    this.#panel.appendChild(this.#emptyState)

    this.#transcript = document.createElement('div')
    this.#transcript.setAttribute('part', 'transcript')
    this.#panel.appendChild(this.#transcript)
    this.#renderStarters()

    this.#statusEl = document.createElement('div')
    this.#statusEl.setAttribute('part', 'status')
    this.#statusEl.hidden = true
    this.#statusText = document.createElement('span')
    this.#statusEl.appendChild(this.#statusText)
    this.#statusDownloadButton = document.createElement('button')
    this.#statusDownloadButton.setAttribute('part', 'status-download')
    this.#statusDownloadButton.textContent = 'Download model'
    this.#statusDownloadButton.hidden = true
    this.#statusEl.appendChild(this.#statusDownloadButton)
    this.#panel.appendChild(this.#statusEl)

    const inputRow = document.createElement('div')
    inputRow.setAttribute('part', 'input-row')
    this.#panel.appendChild(inputRow)

    this.#input = document.createElement('textarea')
    this.#input.setAttribute('part', 'input')
    this.#input.rows = 1
    this.#input.setAttribute('aria-label', 'Message')
    this.#input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault()
        this.#send()
      }
    })
    this.#input.addEventListener('input', () => this.#autoGrowInput())
    inputRow.appendChild(this.#input)

    const sendButton = document.createElement('button')
    sendButton.setAttribute('part', 'send')
    sendButton.setAttribute('aria-label', 'Send')
    sendButton.textContent = '➤'
    sendButton.addEventListener('click', () => this.#send())
    inputRow.appendChild(sendButton)

    this.#setCollapsed(this.getAttribute('collapsed') !== 'false')
  }

  /** Expands the Widget (a no-op if already Expanded). See CONTEXT.md's Trigger entry. */
  expand(): void {
    this.#setCollapsed(false)
  }

  /** Collapses the Widget (a no-op if already Collapsed). */
  collapse(): void {
    this.#setCollapsed(true)
  }

  /** Expands if Collapsed, Collapses if Expanded. */
  toggle(): void {
    this.#setCollapsed(!(this.#collapsedState ?? true))
  }

  #collapsedState: boolean | undefined

  #setCollapsed(collapsed: boolean): void {
    const wasCollapsed = this.#collapsedState
    if (wasCollapsed === collapsed) return
    this.#collapsedState = collapsed
    if (this.#toggleButton) this.#toggleButton.hidden = !collapsed
    if (this.#panel) this.#panel.hidden = collapsed
    if (!collapsed) {
      this.#restoreHistoryIfNeeded()
      void this.#establishParentSession()
      this.#input?.focus()
    }
    // Only a genuine transition dispatches -- not the initial state
    // established at render time, which isn't something happening in
    // response to anything a host needs to react to.
    if (wasCollapsed !== undefined) {
      this.dispatchEvent(new CustomEvent(collapsed ? 'local-chat-collapsed' : 'local-chat-expanded'))
    }
  }

  #historyChecked = false

  /**
   * Reads History synchronously and renders it into the transcript right
   * away, on first Expand -- independent of (and well before) Parent Session
   * establishment, which is comparatively slow (on-device model dependent).
   * See ADR-0005: a Conversation the user already has doesn't need to wait
   * for the model just to be looked at again.
   */
  #restoreHistoryIfNeeded(): void {
    if (this.#historyChecked) return
    this.#historyChecked = true
    const exchanges = readHistory(this.historyKey, this.maxHistory)
    if (exchanges.length === 0) return
    this.#conversationStarted = true
    this.#clearEmptyState()
    for (const exchange of exchanges) {
      this.#appendMessageBubble('user', exchange.user)
      const bubble = this.#appendMessageBubble('assistant', '')
      void renderCompleteMarkdown(bubble, exchange.assistant, (mutate) => this.#autoScrollTranscript(mutate))
    }
    // Claim the Child Session slot synchronously, right now -- before
    // #establishParentSession() is even invoked below -- so a message sent
    // in this same synchronous tick (before any of this has had a chance to
    // await) sees #childSessionPromise already set and awaits this same
    // fork, rather than tripping the ordinary lazy-fork path in
    // #getOrForkChildSession and triggering a second, competing fork.
    this.#childSessionPromise = this.#establishParentSession().then((parent) => this.#forkAndReplayChildSession(parent, exchanges))
    void this.#childSessionPromise.then((child) => this.#generateFollowups(child))
  }

  /**
   * Positions `target` at (`left`, `top`), anchoring each axis toward
   * whichever edge it ends up nearer to (rather than always top-left) -- so
   * a later browser resize tends to keep it near the same edge it was left
   * at. No clamping: dragging fully outside the viewport is allowed, since
   * the toggle and panel each track their own position independently now --
   * dragging one can no longer strand the other somewhere unexpected.
   */
  #anchorTo(target: HTMLElement, left: number, top: number, width: number, height: number): void {
    if (left + width / 2 < window.innerWidth / 2) {
      target.style.left = `${left}px`
      target.style.right = 'auto'
    } else {
      target.style.right = `${window.innerWidth - (left + width)}px`
      target.style.left = 'auto'
    }
    if (top + height / 2 < window.innerHeight / 2) {
      target.style.top = `${top}px`
      target.style.bottom = 'auto'
    } else {
      target.style.bottom = `${window.innerHeight - (top + height)}px`
      target.style.top = 'auto'
    }
  }

  /**
   * Lets the user drag `handle` to reposition `target` (its own independent
   * position -- the toggle and panel each track theirs separately, so
   * dragging one never affects the other). If `onClick` is given, it fires on
   * a genuine click (including a plain synthetic .click()) -- suppressed only
   * when the preceding pointerdown/up sequence moved enough to count as a
   * drag (used for the toggle button, which needs both behaviors, and is
   * also its own `target`).
   *
   * pointermove/pointerup are tracked on `window`, not `handle` -- capture still
   * happens on `handle`, but listening on `window` is the more robust choice
   * regardless of what's capturing.
   */
  #makeDraggable(handle: HTMLElement, target: HTMLElement, onClick?: () => void): void {
    let dragged = false

    handle.addEventListener('pointerdown', (e) => {
      if (e.target !== handle && (e.target as HTMLElement).closest('button')) return
      dragged = false
      handle.setPointerCapture(e.pointerId)
      const startX = e.clientX
      const startY = e.clientY
      const rect = target.getBoundingClientRect()
      const startLeft = rect.left
      const startTop = rect.top

      const onMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragged = true
        this.#anchorTo(target, startLeft + dx, startTop + dy, rect.width, rect.height)
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    })

    if (onClick) {
      handle.addEventListener('click', () => {
        if (!dragged) onClick()
      })
    }
  }

  /**
   * Lets the user drag `handle` (positioned at `target`'s top-left corner) to
   * resize `target` -- growing it as the handle moves up/left, shrinking it as
   * it moves down/right, matching the panel's bottom-right anchor: that corner
   * stays put, and the handle at the opposite corner is what visually moves.
   * `target`'s CSS min/max-width/height clamp the rendered size regardless of
   * what's computed here, so there's no separate bounds-checking to do.
   * pointermove/pointerup are tracked on `window`, not `handle` (see
   * #makeDraggable).
   */
  #makeResizable(handle: HTMLElement, target: HTMLElement): void {
    handle.addEventListener('pointerdown', (e) => {
      handle.setPointerCapture(e.pointerId)
      const startX = e.clientX
      const startY = e.clientY
      const rect = target.getBoundingClientRect()
      const startWidth = rect.width
      const startHeight = rect.height

      const onMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY
        target.style.width = `${startWidth - dx}px`
        target.style.height = `${startHeight - dy}px`
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    })
  }

  #instructionsOverride: string | undefined

  get instructions(): string {
    if (this.#instructionsOverride !== undefined) return this.#instructionsOverride
    return this.getAttribute('instructions') ?? DEFAULT_INSTRUCTIONS
  }

  set instructions(value: string) {
    this.#instructionsOverride = value
  }

  #logoOverride: string | undefined

  get logo(): string {
    if (this.#logoOverride !== undefined) return this.#logoOverride
    return this.getAttribute('logo') ?? DEFAULT_LOGO
  }

  set logo(value: string) {
    this.#logoOverride = value
  }

  /**
   * Renders `this.logo` into `el` -- as an <img> if it looks like an image
   * reference (a data: URI, an absolute/relative URL, or a filename with a
   * common image extension), matching a host's expectation that a URL-like
   * logo value renders as an image rather than literal text. Anything else
   * (typically an emoji) is set as plain text, as before. `el` is used both
   * decoratively (the toggle button already has its own aria-label, and the
   * header logo is aria-hidden), so the image gets an empty alt either way.
   */
  #renderLogoInto(el: HTMLElement): void {
    const value = this.logo
    el.textContent = ''
    if (looksLikeImageSource(value)) {
      const img = document.createElement('img')
      img.src = value
      img.alt = ''
      el.appendChild(img)
    } else {
      el.textContent = value
    }
  }

  #contextOverride: string | undefined

  get context(): string {
    if (this.#contextOverride !== undefined) return this.#contextOverride
    const attr = this.getAttribute('context')
    return attr === null ? '' : coerceToText(attr)
  }

  set context(value: string) {
    this.#contextOverride = value
  }

  #emptyMessageOverride: string | undefined

  get emptyMessage(): string {
    if (this.#emptyMessageOverride !== undefined) return this.#emptyMessageOverride
    return this.getAttribute('empty-message') ?? DEFAULT_EMPTY_MESSAGE
  }

  set emptyMessage(value: string) {
    this.#emptyMessageOverride = value
  }

  #startersOverride: string | undefined

  get starters(): string[] {
    if (this.#startersOverride !== undefined) return coerceToList(this.#startersOverride)
    const attr = this.getAttribute('starters')
    return attr === null ? [] : coerceToList(attr)
  }

  set starters(value: string) {
    this.#startersOverride = value
  }

  #renderStarters(): void {
    const starters = this.starters
    if (starters.length > 0) {
      const container = this.#renderPills('starter', starters, (text) => this.#submitText(text))
      this.#appendToTranscript(container)
    }
    this.#updateEmptyMessage()
  }

  /**
   * Shows the Empty message only once it's clear neither a Starter nor an
   * Icebreaker is going to appear in its place -- checked directly against
   * the transcript's rendered content rather than a separately-tracked flag,
   * so it can never drift out of sync with what's actually visible. A no-op
   * once a real Exchange has started; #clearEmptyState handles that case.
   */
  #updateEmptyMessage(): void {
    if (!this.#emptyState || this.#conversationStarted) return
    const hasPills = !!this.#transcript?.querySelector('[part="starters"], [part="icebreakers"]')
    this.#emptyState.textContent = hasPills ? '' : this.emptyMessage
  }

  /** Removes any Starter/Icebreaker pills and the Empty message -- shared by every path that starts a real Exchange. */
  #clearEmptyState(): void {
    this.#transcript?.querySelectorAll('[part="starters"], [part="icebreakers"]').forEach((el) => el.remove())
    if (this.#emptyState) this.#emptyState.textContent = ''
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

    const availability = await LM.availability(languageModelOptions())
    const session =
      availability === 'downloadable'
        ? await this.#createSessionAfterUserConsent(LM)
        : await this.#createSessionShowingStatus(LM, availability === 'downloading' ? 'Downloading the model…' : 'Starting the chat…')

    const contextText = this.#combinedContext()
    if (contextText) {
      await session.append([{ role: 'user', content: `Reference context:\n\n${contextText}` }])
    }
    if (this.hasAttribute('icebreakers')) {
      void this.#generateIcebreakers(session)
    }
    return session
  }

  /**
   * Forks a Child Session from `parentSession` and replays every restored
   * Exchange into it (see ADR-0005), so the Conversation continues from
   * where History left off instead of starting over.
   */
  async #forkAndReplayChildSession(parentSession: LanguageModelSession, exchanges: Exchange[]): Promise<LanguageModelSession> {
    const child = await parentSession.clone()
    const messages: LanguageModelMessage[] = exchanges.flatMap((exchange) => [
      { role: 'user' as const, content: exchange.user },
      { role: 'assistant' as const, content: exchange.assistant },
    ])
    await child.append(messages)
    return child
  }

  #createSession(LM: LanguageModelAPI, onProgress?: (fraction: number) => void): Promise<LanguageModelSession> {
    const initialPrompts: LanguageModelMessage[] = [{ role: 'system', content: this.instructions }]
    return LM.create({
      initialPrompts,
      ...languageModelOptions(),
      monitor: onProgress ? (monitor) => monitor.addEventListener('downloadprogress', (e) => onProgress(e.loaded)) : undefined,
    })
  }

  async #createSessionShowingStatus(LM: LanguageModelAPI, message: string): Promise<LanguageModelSession> {
    this.#setStatus(message)
    const session = await this.#createSession(LM)
    this.#setStatus(undefined)
    return session
  }

  /**
   * The on-device model isn't installed yet -- calling create() would trigger
   * a (potentially large, one-time) download immediately, so this waits for an
   * explicit click on the status area's download button instead of doing that
   * automatically just because the Widget was expanded.
   */
  #createSessionAfterUserConsent(LM: LanguageModelAPI): Promise<LanguageModelSession> {
    return new Promise((resolve, reject) => {
      this.#setStatus("This chat runs entirely on your device, but the on-device model isn't installed yet.", () => {
        this.#setStatus('Downloading the model…')
        this.#createSession(LM, (fraction) => this.#setStatus(`Downloading the model… ${Math.round(fraction * 100)}%`))
          .then((session) => {
            this.#setStatus(undefined)
            resolve(session)
          }, reject)
      })
    })
  }

  #setStatus(message: string | undefined, onDownload?: () => void): void {
    if (!this.#statusEl || !this.#statusText || !this.#statusDownloadButton) return
    this.#statusEl.hidden = message === undefined
    this.#statusText.textContent = message ?? ''
    this.#statusDownloadButton.hidden = !onDownload
    this.#statusDownloadButton.onclick = onDownload ?? null
  }

  #currentIcebreakerScratch: LanguageModelSession | undefined
  #icebreakerOptions: string[] | undefined
  #conversationStarted = false

  async #generateIcebreakers(parentSession: LanguageModelSession): Promise<void> {
    const max = this.maxFollowups
    if (max === 0 || this.#conversationStarted) return
    const scratch = await parentSession.clone()
    this.#currentIcebreakerScratch = scratch
    const options = await this.#requestSuggestions(
      scratch,
      `Suggest up to ${max} brief opening questions a visitor could ask about the subject matter in the reference ` +
        `context above -- questions that context can actually answer. Do not suggest questions about this chat ` +
        `assistant itself (what it can do, how it works, its capabilities, etc.) -- only questions about the topic ` +
        `the context covers. If the context doesn't clearly support at least one good, specific question, return ` +
        `fewer than ${max}, or an empty array -- do not invent generic filler questions just to reach ${max}.`,
      max,
    )
    if (this.#currentIcebreakerScratch !== scratch) return // Superseded while awaiting.
    this.#currentIcebreakerScratch = undefined
    this.#icebreakerOptions = options
    this.#renderIcebreakers()
  }

  #renderIcebreakers(): void {
    // The Conversation may have started (e.g. a Starter clicked) after this
    // generation call began but before Icebreaker generation even kicked off --
    // #supersedeInFlightScratchSessions only catches generation already in
    // flight at send-time, so this is the last line of defense against
    // rendering into a transcript nobody is looking at anymore.
    if (this.#conversationStarted) return
    if (this.#icebreakerOptions && this.#icebreakerOptions.length > 0) {
      const container = this.#renderPills('icebreaker', this.#icebreakerOptions, (text) => this.#submitText(text))
      this.#appendToTranscript(container)
    }
    this.#updateEmptyMessage()
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
    this.#appendToTranscript(bubble)
    return bubble
  }

  /**
   * Appends `el` to the transcript, auto-scrolling to reveal it only if the
   * user was already scrolled at (or very near) the bottom beforehand --
   * never yanking them down mid-read or while reviewing earlier messages.
   */
  #appendToTranscript(el: HTMLElement): void {
    this.#autoScrollTranscript(() => this.#transcript?.appendChild(el))
  }

  /**
   * Runs `mutate`, auto-scrolling the transcript to the bottom afterward only
   * if the user was already at (or very near) the bottom beforehand. Used for
   * every transcript-growing change, including each individual streamed chunk
   * -- not just the one-time append of a (possibly still-empty) bubble --
   * since content keeps growing well after that initial append.
   */
  #autoScrollTranscript(mutate: () => void): void {
    const transcript = this.#transcript
    if (!transcript) {
      mutate()
      return
    }
    const wasAtBottom = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight <= 4
    mutate()
    if (wasAtBottom) transcript.scrollTop = transcript.scrollHeight
  }

  get maxFollowups(): number {
    const raw = this.getAttribute('max-followups')
    if (raw === null) return 3
    const parsed = Number.parseInt(raw, 10)
    return Number.isNaN(parsed) || parsed < 0 ? 3 : parsed
  }

  get maxHistory(): number {
    const raw = this.getAttribute('max-history')
    if (raw === null) return 5
    const parsed = Number.parseInt(raw, 10)
    return Number.isNaN(parsed) || parsed < 0 ? 5 : parsed
  }

  get historyKey(): string {
    return this.getAttribute('history-key') ?? 'url'
  }

  #send(): void {
    const text = this.#input?.value.trim() ?? ''
    if (!text) return
    if (this.#input) this.#input.value = ''
    this.#autoGrowInput()
    this.#submitText(text)
  }

  /** Grows the input to fit its content, up to the CSS max-height, beyond which it scrolls internally. */
  #autoGrowInput(): void {
    if (!this.#input) return
    this.#input.style.height = 'auto'
    this.#input.style.height = `${this.#input.scrollHeight}px`
  }

  #clear(): void {
    this.#supersedeInFlightScratchSessions()
    void this.#childSessionPromise?.then((session) => session.destroy())
    this.#childSessionPromise = undefined
    this.#conversationStarted = false
    clearHistory(this.historyKey)
    if (this.#transcript) this.#transcript.innerHTML = ''
    this.#clearEmptyState()
    this.#renderStarters()
    this.#renderIcebreakers()
  }

  #submitText(text: string): void {
    this.#clearEmptyState()
    this.#input?.focus()
    void this.#sendMessage(text)
  }

  #supersedeInFlightScratchSessions(): void {
    if (this.#currentFollowupScratch) {
      this.#currentFollowupScratch.destroy()
      this.#currentFollowupScratch = undefined
    }
    if (this.#currentIcebreakerScratch) {
      this.#currentIcebreakerScratch.destroy()
      this.#currentIcebreakerScratch = undefined
    }
  }

  async #sendMessage(text: string): Promise<void> {
    this.#conversationStarted = true
    this.#supersedeInFlightScratchSessions()
    this.dispatchEvent(new CustomEvent('local-chat-message-sent', { detail: { text } }))
    this.#appendMessageBubble('user', text)
    const bubble = this.#appendMessageBubble('assistant', '')
    try {
      const session = await this.#getOrForkChildSession()
      this.#setStatus('Thinking…')
      const stream = session.promptStreaming(text, {})
      let firstChunk = true
      const response = await renderMarkdownStream(bubble, stream, (mutate) => {
        if (firstChunk) {
          this.#setStatus(undefined)
          firstChunk = false
        }
        this.#autoScrollTranscript(mutate)
      })
      this.#setStatus(undefined)
      this.dispatchEvent(new CustomEvent('local-chat-response-received', { detail: { text: response } }))
      appendExchange(this.historyKey, { user: text, assistant: response }, this.maxHistory)
      await this.#generateFollowups(session)
    } catch (error) {
      this.#setStatus(undefined)
      this.dispatchEvent(new CustomEvent('local-chat-error', { detail: { error } }))
    }
  }

  #currentFollowupScratch: LanguageModelSession | undefined

  async #generateFollowups(childSession: LanguageModelSession): Promise<void> {
    const max = this.maxFollowups
    if (max === 0) return
    const scratch = await childSession.clone()
    this.#currentFollowupScratch = scratch
    const options = await this.#requestSuggestions(
      scratch,
      `Suggest up to ${max} brief follow-up questions the user might want to ask next, based on the conversation so ` +
        `far -- but only questions that can actually be answered using the reference context provided earlier in ` +
        `this conversation. If the context doesn't support a good, relevant follow-up, return fewer than ${max}, or ` +
        `an empty array -- do not invent questions the context can't answer just to reach ${max}.`,
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
    if (options.length === 0) return
    const container = this.#renderPills('followup', options, (text) => {
      container?.remove()
      this.#input?.focus()
      void this.#sendMessage(text)
    })
    this.#appendToTranscript(container)
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
