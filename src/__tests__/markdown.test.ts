import { describe, expect, it } from 'vitest'
import { renderMarkdownStream, UnsafeContentError } from '../markdown.js'

function streamOf(chunks: string[]): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
}

describe('renderMarkdownStream', () => {
  it('renders markdown from a fully cumulative stream (each chunk is the full text so far)', async () => {
    const container = document.createElement('div')

    await renderMarkdownStream(container, streamOf(['Hello ', 'Hello **wor', 'Hello **world**']))

    expect(container.innerHTML).toContain('<strong>world</strong>')
    expect(container.textContent).toBe('Hello world')
  })

  it('renders markdown from a fully incremental stream (each chunk is new text only)', async () => {
    const container = document.createElement('div')

    await renderMarkdownStream(container, streamOf(['Hello ', '**wor', 'ld**']))

    expect(container.innerHTML).toContain('<strong>world</strong>')
    expect(container.textContent).toBe('Hello world')
  })

  it('returns the final accumulated text', async () => {
    const container = document.createElement('div')

    const result = await renderMarkdownStream(container, streamOf(['one ', 'two']))

    expect(result).toBe('one two')
  })

  it('throws UnsafeContentError and stops rendering when unsafe content is detected', async () => {
    const container = document.createElement('div')

    await expect(
      renderMarkdownStream(container, streamOf(['safe text ', '<script>alert(1)</script>'])),
    ).rejects.toThrow(UnsafeContentError)
  })
})
