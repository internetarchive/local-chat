export class LocalChat extends HTMLElement {
  static readonly tagName = 'local-chat'

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }
}

customElements.define(LocalChat.tagName, LocalChat)
