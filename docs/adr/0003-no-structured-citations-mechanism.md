---
status: accepted
---

# No structured citations/links mechanism — citation links are organic markdown

An early design pass toward supporting citation links (to page sections,
or external URLs) reached for a structured mechanism: a host-declared list
of `{ title, url }` entries, described to the model, with the model
instructed to cite relevant ones at the end of a response in a
recognizable, parseable format.

## Decision

There's no structured citations mechanism at all. If a host wants the
assistant to be able to link to something, they say so via `context` or
`instructions` — a plain-language description is enough — and the model
produces ordinary markdown links (`[text](url)`) in its prose when
relevant, rendered exactly like any other markdown link.

## Considered Options

- **A structured list property, described to the model, parsed back out
  of a recognizable trailer format.** Rejected: it's meaningfully more
  component surface (a new property, a parsing step, a rendering
  treatment for whatever gets parsed out) for something a general-purpose
  markdown renderer already does for free the moment the model writes a
  normal link. It also reintroduces exactly the "structured output mixed
  with free-flowing prose" problem ADR-0001 moved away from, just
  relocated to a different feature.
- **Plain markdown links via context/instructions (chosen).** No new
  component surface at all — citation behavior is entirely a property of
  what the host tells the model to do, not something the component
  manages structurally.

## Consequences

- A host wanting reliable citation behavior needs to actually describe
  the linkable destinations somewhere in `context`/`instructions`
  themselves (e.g., "the Pricing page is at /pricing") — there's no
  structured list to hand over instead, and result quality depends on how
  clearly that's described.
- Nothing stops a host from building their own structured-links
  convention inside their own `context` text if they want one; the
  component just doesn't manage or parse it.
