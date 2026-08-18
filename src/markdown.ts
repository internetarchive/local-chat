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
 *
 * `wrap` is invoked once per chunk, around the DOM mutation that renders it --
 * lets a caller do something (e.g. maintain scroll position) around every
 * incremental update, not just once when `container` was first attached.
 *
 * Sanitization runs on `container` itself (the real rendered DOM), in place,
 * after each write -- not on the raw markdown source text. `streaming-markdown`
 * never uses innerHTML anywhere, only createElement/createTextNode, so literal
 * text that happens to look like a tag (e.g. a response mentioning
 * `<local-chat>`) always ends up as a plain text node, never re-interpreted as
 * markup -- sanitizing the source string instead would (and did) treat that
 * text as if it were HTML, misdetecting it as an unrecognized element and
 * discarding the rest of the response right at that point. The one genuine
 * residual risk is a markdown link/image whose href/src ends up dangerous
 * (e.g. a `javascript:` URI); sanitizing the real DOM node still catches that.
 */
export async function renderMarkdownStream(
  container: HTMLElement,
  stream: ReadableStream<string>,
  wrap: (mutate: () => void) => void = (mutate) => mutate(),
): Promise<string> {
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

      wrap(() => smd.parser_write(parser, delta))

      DOMPurify.sanitize(container, { IN_PLACE: true })
      if (DOMPurify.removed.length > 0) {
        throw new UnsafeContentError('Unsafe content removed from model output')
      }
    }
  } finally {
    smd.parser_end(parser)
  }
  return accumulated
}
