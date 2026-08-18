---
status: accepted
---

# Follow-up/Icebreaker generation runs on a disposable Scratch Session, destroyed (not signal-aborted) when superseded

Once Follow-up/Icebreaker generation became a separate call (see
ADR-0001), the question became: what session does that call run on?
Running it directly on the durable Parent or Child Session looked
simplest, but a newer user message can make an in-flight Follow-up or
Icebreaker call pointless before it resolves, and that call then needs to
be shut down promptly without disturbing anything durable.

Prior direct testing against this on-device model API found that signaling
`abort()` on an in-flight call is not sufficient on its own to free the
model promptly for the next call — the engine kept working through the
aborted call anyway, backlogging whatever came after it. That finding is
treated as established behavior of the underlying engine here, not
something to re-verify from scratch.

## Decision

Follow-up/Icebreaker generation always runs on a Scratch Session — a
disposable clone of whichever durable session (Parent, or Child once one
exists) is current, used for exactly one such call and nothing else. When
a newer message supersedes an in-flight Follow-up/Icebreaker call, its
Scratch Session is destroyed immediately, not merely signaled to abort.

## Considered Options

- **Run the call directly on the durable session, signal `abort()` when
  superseded.** Rejected on two counts: the prior evidence that a signal
  alone doesn't promptly free the engine, which would leave the *next*
  real call (the user's new message) waiting behind a supposedly-cancelled
  one; and destroying the durable session outright to force the issue
  would blow away the actual Conversation history or the Parent's
  expensive priming — not an option.
- **Run the call directly on the durable session, tolerate the backlog.**
  Rejected: it directly undermines the responsiveness a chat widget is
  supposed to have, exactly when a user is actively engaged enough to
  already be typing a follow-up message of their own.
- **A disposable Scratch Session per call, destroyed when superseded
  (chosen).** Destroying it is always safe, since it never held anything
  durable — the actual Conversation and the Parent's priming are never at
  risk. The new message's own call runs on the untouched durable session
  and never has to wait on anything.

## Consequences

- A Follow-up/Icebreaker call that resolves normally, not just a
  superseded one, still never leaves its "suggest some options" exchange
  sitting in the Conversation's own history — a suggestion nobody acted on
  doesn't pollute what the assistant remembers about the conversation
  either way.
- This adds a small amount of session-management bookkeeping (tracking
  and cleaning up whichever Scratch Session is currently outstanding) that
  a single-session design wouldn't need.
- The durable hierarchy stays exactly two generations (Parent, Child) —
  Scratch Sessions are a separate, always-disposable mechanism layered on
  top for these specific calls, not a third generation in the
  Conversation-holding hierarchy itself.
