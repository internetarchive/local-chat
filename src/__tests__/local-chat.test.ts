import { describe, expect, it } from 'vitest'
import { LocalChat } from '../local-chat.js'

describe('LocalChat', () => {
  it('registers itself as the local-chat custom element', () => {
    expect(customElements.get('local-chat')).toBe(LocalChat)
  })

  it('attaches an open Shadow DOM to render into', () => {
    const chat = new LocalChat()

    expect(chat.shadowRoot).not.toBeNull()
    expect(chat.shadowRoot?.mode).toBe('open')
  })
})
