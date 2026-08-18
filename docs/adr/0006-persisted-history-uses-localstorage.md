---
status: accepted
---

# Persisted History uses localStorage, not IndexedDB

Persisted History (see `SPEC.md`'s History section) needs some durable,
cross-page-load client-side storage. Two natural candidates: `localStorage`
(synchronous, string-only, roughly a 5–10MB per-origin quota) and
IndexedDB (asynchronous, structured data, much larger practical capacity,
considerably more API surface — transactions, an upgrade lifecycle, its
own error paths).

## Decision

Use `localStorage`.

## Considered Options

- **IndexedDB (rejected).** Its strengths — large capacity, structured
  querying, avoiding main-thread blocking on large payloads — aren't
  earned by what's actually stored here: a `max-history`-capped handful
  of short text Exchanges, already bounded by design specifically to
  avoid growing unbounded. The async API adds real implementation
  surface for no corresponding benefit at this size.
- **localStorage (chosen).** Synchronous — no async ceremony for
  something this small, and the read already happens at a point (first
  Expand) where the Widget is doing several other synchronous DOM
  operations anyway. Quota is a non-issue once bounded by `max-history`.
  Meaningfully smaller implementation surface than IndexedDB for the
  same result.

## Consequences

- If `max-history` or the definition of an Exchange ever grows to cover
  much larger payloads (attachments, embeddings, anything beyond short
  text), this decision would need revisiting — `localStorage`'s quota
  and synchronous nature stop being a good fit well before IndexedDB's
  would. Not a concern for the current scope.
- Every persisted entry is internally namespaced under a fixed prefix
  regardless of the resolved `history-key`, so History can never collide
  with anything else the host page stores under a plain key in the same
  origin's `localStorage`.
