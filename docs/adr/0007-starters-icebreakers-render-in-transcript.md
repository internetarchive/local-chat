---
status: accepted
---

# Starters and Icebreakers render in the transcript, not a separate empty-state container

Starters and Icebreakers originally rendered into their own `empty-state`
element, a sibling of the transcript that appeared before it in the panel.
Follow-ups, generated later in the same Conversation, rendered into the
transcript instead. This split had no real justification — all three are
the same kind of thing (a clickable pill suggesting the next message) — and
it caused a genuine layout bug: `empty-state` never got the transcript's
own `flex: 1` / `overflow-y: auto` treatment, so once its Starters/
Icebreakers pills grew past the available height (a short panel, or enough
suggestions), the whole element just kept growing and pushed the status
line and input row out of the panel entirely, with no way to scroll to see
them.

## Decision

Starters and Icebreakers now render into the transcript, exactly like
Follow-ups — same container, same auto-scroll handling, same overflow
behavior. `empty-state` still exists as its own element and `::part()`,
but its job changes: it now holds a plain, non-interactive Empty message,
shown only when neither a Starter nor an Icebreaker exists to show instead
(see the new `empty-message` attribute/property in `SPEC.md`). It's
cleared for good the moment a real Exchange begins, the same trigger that
already cleared it before.

## Considered Options

- **Give `empty-state` the transcript's own `flex`/`overflow` CSS,
  otherwise unchanged (rejected).** Would have fixed the reported layout
  bug on its own, with no breaking change at all. Rejected anyway: it
  leaves the actual root cause in place (two container to hold what is
  functionally identical content), and the component is young enough that
  the breaking change is worth taking now, before hosts have built up
  styling that depends on the old split.
- **Starters/Icebreakers in the transcript, drop `empty-state` entirely
  (rejected).** `empty-state` is a documented, public `::part()` name;
  removing it outright breaks any host already targeting it, for no
  benefit over just repurposing it.
- **Starters/Icebreakers in the transcript, `empty-state` repurposed as an
  Empty message (chosen).** Fixes the layout bug at its root (one
  container, one set of overflow rules, for anything that can appear
  before the first message), keeps `empty-state` a meaningful, still-public
  part, and adds a small net-new capability (a configurable Empty message)
  along the way.

## Consequences

- `#renderStarters()`/`#renderIcebreakers()` append into the transcript via
  the same `#appendToTranscript()` Follow-ups already use, inheriting its
  auto-scroll handling and overflow/scrolling for free.
- A host already targeting `::part(empty-state)` to style the old
  Starters/Icebreakers container gets different content there now (a
  plain message, not pills) — a breaking change, accepted per the above.
- New `empty-message` attribute/property (default text describing the
  Widget as an on-device AI chat), shown/hidden based on whether the
  transcript currently holds any Starter/Icebreaker pill — checked
  directly against the rendered DOM rather than tracked via a separate
  flag, so it can never drift out of sync with what's actually visible.
- Clearing the pre-conversation state (on first real message, on History
  restore, and implicitly via the transcript wipe on Clear) now needs to
  remove Starter/Icebreaker pill containers from the transcript in
  addition to resetting the Empty message text — both handled by one
  shared helper rather than duplicated at each call site.
