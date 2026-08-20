---
status: accepted
---

# Visual state (Collapsed/Expanded, position, size) persists to sessionStorage, scoped by the renamed `storage-key`

The Widget always starts Collapsed (or whatever the `collapsed` attribute
says), at its default position and size, regardless of what the visitor
last did with it -- expanding it, dragging it, or resizing it, then
reloading the page or navigating elsewhere on the same site, loses all of
it. History already solves this class of problem for Conversation content;
nothing solved it for the Widget's own presentation.

## Decision

Persist Collapsed/Expanded, the toggle icon's position, the panel's
position, and the panel's size -- collectively, Visual state (see
`CONTEXT.md`) -- to `sessionStorage`, as one consolidated record per scope.
Each field is written only at the moment the visitor actually changes it
from its default (a completed drag, a completed resize, a real
Collapse/Expand transition) -- never on initial render, and never
speculatively for fields nothing has touched yet. A persisted value, once
it exists, wins over whatever the `collapsed` attribute says on every later
load in the same tab/session; the attribute only ever seeds the very first
visit. Position and size have no attribute counterpart to seed from --
persisting simply overrides the CSS default once it exists.

The `history-key` attribute is renamed to `storage-key` and now scopes both
History and Visual state identically (`origin`/`path`/`url` keywords, or a
verbatim literal -- see `SPEC.md`). This is a breaking rename, accepted for
the same reason the recent Starters/Icebreakers change was: the component
is young enough that taking it now costs less than carrying a
History-specific name for what's become a general storage-scope concept.

## Considered Options

- **`localStorage`, matching History (rejected).** Would need its own
  affordance to clear stale state, the same way History has the visible
  Clear button -- without one, a durable position/size preference a visitor
  no longer wants would follow them indefinitely with no way to reset it
  short of clearing site data outright. No such affordance is planned.
- **`sessionStorage` (chosen).** Naturally expires when the tab closes,
  which stands in for a Clear affordance without building one. Visual
  state is lower-stakes than Conversation content -- losing it at the end
  of a session is an acceptable, arguably correct default, not a loss
  worth guarding against the way History's content is.
- **Leave it entirely to the host (rejected).** `local-chat-expanded`/
  `local-chat-collapsed` already dispatch on every transition, and a host
  could listen for them and set the `collapsed` attribute themselves before
  the element connects on a later load. Rejected for the same reason
  History itself is built in rather than left to every embedder: sparing
  each host the same boilerplate is the whole point of building it into
  the component.
- **Persist Collapsed/Expanded only, leave position/size in-memory
  (considered).** The original issue was filed scoped this narrowly.
  Widened during design once it became clear position/size share the exact
  same mechanism, storage, and rationale, and would ship in the same
  change regardless -- splitting them into a separate follow-up added
  bookkeeping, not safety.
- **Keep `history-key` as the shared attribute name (rejected).** Reads as
  though it only scopes History, once it's also scoping something with
  nothing to do with chat content.

## Consequences

- `resolveHistoryKey` (in `history.ts`) is extracted into a shared
  `resolveStorageScope` (`storage-scope.ts`), imported by both `history.ts`
  and the new `visual-state.ts` -- one scope-resolution function, two
  storage backends.
- New `visual-state.ts` module, structured like `history.ts`: a schema
  version, a fixed internal prefix (`local-chat:visual-state:`, distinct
  from History's `local-chat:history:`), and the same never-throw-on-
  storage-failure posture. `writeVisualState` merges its patch into
  whatever's already persisted, so writing one field (e.g. `panelSize`)
  never clobbers another (e.g. `collapsed`) written earlier.
- `#setCollapsed`'s existing `wasCollapsed !== undefined` guard -- already
  used to skip dispatching `local-chat-expanded`/`local-chat-collapsed` on
  the initial render-time state resolution -- now also skips persisting
  that same initial resolution, for the same reason. Every real transition
  after that, regardless of path (built-in toggle, close button, Escape,
  a `trigger-selector` match, or a public method call), funnels through
  this one method and persists uniformly.
- `#makeDraggable` gains an `onDragEnd` callback, fired only when a
  completed drag actually moved `target` past the existing 3px threshold
  (never on a plain click) -- used to persist the toggle's and panel's
  position independently. `#makeResizable` gains the equivalent guard
  inline, since it only ever has the one caller (the panel).
- A host already targeting `history-key` needs to rename it to
  `storage-key` -- a breaking change, accepted per the Decision above.
- Restoring a persisted position re-applies the exact `left`/`right`/
  `top`/`bottom` values `#anchorTo` last computed, verbatim -- it does not
  re-derive the anchor edge against the current viewport. This matches
  ADR-0004's already-accepted stance (no clamping, no re-anchoring
  guarantees beyond what dragging itself already provides).
- Restoring a persisted panel size is safe regardless of value: the
  panel's CSS `min`/`max-width`/`height` already clamp the rendered size
  (see `#makeResizable`'s own comment), unaffected by this change.
