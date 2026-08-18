import * as smd from 'streaming-markdown'
import DOMPurify from 'dompurify'

export class UnsafeContentError extends Error {}

/**
 * Renders a stream of markdown text chunks incrementally into `container`.
 *
 * The underlying model API's chunk format (cumulative full-text-so-far, or
 * incremental deltas) isn't asserted here -- each chunk is checked against
 * what's already been accumulated to tell which it is, rather than assuming
 * one or the other.
 */
export async function renderMarkdownStream(container: HTMLElement, stream: ReadableStream<string>): Promise<string> {
  const renderer = smd.default_renderer(container)
  const parser = smd.parser(renderer)
  let accumulated = ''
  const reader = stream.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const isCumulative = value.startsWith(accumulated)
      const delta = isCumulative ? value.slice(accumulated.length) : value
      accumulated = isCumulative ? value : accumulated + value

      DOMPurify.sanitize(accumulated)
      if (DOMPurify.removed.length > 0) {
        throw new UnsafeContentError('Unsafe content removed from model output')
      }

      smd.parser_write(parser, delta)
    }
  } finally {
    smd.parser_end(parser)
  }
  return accumulated
}
