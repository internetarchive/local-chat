---
status: accepted
---

# Restored History renders immediately; the Child Session it needs is primed in the background

Persisted History (see `SPEC.md`'s History section) needs to do two
things on first Expand: show the user their prior Conversation right
away, and let that Conversation actually continue when they send their
next message. The straightforward approach — wait for the Parent Session
(and the Child Session forked and primed from it) before rendering
anything — ties a display operation with zero model dependency to the
same, comparatively slow, on-device-model-dependent latency budget as
actual generation. A visitor's prior conversation is sitting in storage,
retrievable instantly; there's no good reason to leave it unrendered
behind a loading spinner just because the model happens to still be
starting up.

## Decision

On first Expand, History is read synchronously from storage and rendered
into the transcript immediately, independent of Parent Session
establishment — which proceeds on its own schedule exactly as it already
does for a Widget with no History. Once the Parent Session resolves, the
Child Session is forked and primed eagerly, by replaying the restored
Exchanges into it — rather than waiting for the user's next message, the
ordinary lazy-fork path. Only once that replay completes are Follow-ups
generated once from the last restored Exchange.

## Considered Options

- **Wait for Parent/Child Session setup before showing anything
  (rejected).** Ties a zero-model-dependency display operation to the
  slowest part of the whole system, for no benefit — the user stares at
  a loading state while their own already-available prior conversation
  sits unrendered in storage.
- **Show the restored transcript, but keep the ordinary lazy Child
  Session fork for the user's next message, same as when there's no
  History (rejected).** Not just a UX gap but a correctness bug: the
  user would be sending a message into what the model treats as a brand
  new conversation, with no memory of the exchanges rendered right above
  it on screen.
- **Show the restored transcript immediately, eagerly fork and prime the
  Child Session once the Parent Session resolves (chosen).** The only
  option where what's rendered and what the model actually remembers
  stay in sync, without blocking the (already synchronous, already fast)
  display on the (comparatively slow) model.

## Consequences

- Two distinct trigger points now exist for forking a Child Session —
  the ordinary lazy path (the user's first new message) and this eager
  path (History existing on Expand) — both funneled through the same
  memoized `#childSessionPromise`, so there's no duplicated
  session-forking logic and no new synchronization primitive: a message
  sent before the eager replay finishes just transparently awaits the
  same promise a lazily-triggered fork would have produced.
- The rendered transcript can, briefly, be visually ahead of what the
  model has actually "seen" (during Parent/Child Session setup) — an
  acceptable window, since it's the same generation-flow lag that
  already exists today for the very first message of a fresh
  Conversation (typing while the Parent Session is still loading already
  works this way).
