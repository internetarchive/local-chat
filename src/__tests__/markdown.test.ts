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

  it('throws UnsafeContentError when a real dangerous element/attribute is rendered', async () => {
    const container = document.createElement('div')

    // A markdown image whose src is a javascript: URI -- unlike a literal
    // "<script>" mention (which streaming-markdown only ever renders as
    // escaped text, never a real element), this genuinely produces a
    // dangerous attribute in the rendered DOM.
    await expect(
      renderMarkdownStream(container, streamOf(['![x](', 'javascript:alert(1)', ')'])),
    ).rejects.toThrow(UnsafeContentError)
  })

  it('does not flag literal text that merely looks like an HTML tag, e.g. mentioning <local-chat>', async () => {
    const container = document.createElement('div')

    const result = await renderMarkdownStream(
      container,
      streamOf(['The `<local-chat>` element ', 'is a self-contained custom element.']),
    )

    expect(result).toBe('The `<local-chat>` element is a self-contained custom element.')
    expect(container.textContent).toBe('The <local-chat> element is a self-contained custom element.')
  })

  it('wraps each chunk write through the given hook, so a caller can act around every mutation', async () => {
    const container = document.createElement('div')
    let wrapCalls = 0

    await renderMarkdownStream(container, streamOf(['one ', 'two ', 'three']), (mutate) => {
      wrapCalls += 1
      mutate()
    })

    // One call per chunk, plus one more for the final parser_end flush --
    // streaming-markdown can flush still-pending buffered content there (a
    // real DOM mutation), so it needs the same wrap coverage as every chunk.
    expect(wrapCalls).toBe(4)
    expect(container.textContent).toBe('one two three')
  })
})
