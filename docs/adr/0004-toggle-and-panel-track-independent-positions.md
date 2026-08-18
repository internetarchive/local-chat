---
status: accepted
---

# The toggle icon and the panel each track their own position independently

The Widget's host element was originally the single `position: fixed`
box, anchored via `inset-inline-end`/`inset-block-end`, shrink-wrapping to
whichever child (the small toggle icon, or the much larger panel) was
currently visible. Dragging either one moved the host itself, so both
shared one anchor.

Live testing surfaced a sequence of problems that all traced back to that
sharing: expanding after dragging the toggle icon could render the panel
mostly off-screen (the anchor, set from the icon's small size, put the
panel's far corner well past the viewport once the box grew); collapsing
after dragging the panel could land the icon far from where the panel
actually was; and dragging the panel down until its lower edge passed the
viewport produced a negative anchor offset that, reused for the icon,
pushed it entirely off-screen with nothing visible at all. Two rounds of
fixes (anchor-edge-flipping based on viewport proximity, then clamping the
result to stay on-screen) each patched a specific symptom, but the
underlying cause was always the same: a raw pixel offset computed for one
child's size isn't safe to reuse verbatim for a very differently-sized
sibling, and reusing it is exactly what a shared anchor requires.

## Decision

Give the toggle icon and the panel their own independent `position:
fixed` (moved down from `:host`, which no longer positions anything
itself). Dragging one only ever updates its own element's position;
the other is untouched. No clamping to the viewport — a box is now free
to be dragged fully off-screen if the user does that, since doing so can
no longer strand the other one anywhere.

## Considered Options

- **Keep one shared anchor, keep patching (rejected).** The prior two
  fixes (anchor-edge-flipping, viewport clamping) were both real
  improvements, but each was a heuristic patching a specific symptom of
  the same root mismatch — a single position genuinely can't represent
  "where the icon is" and "where the panel is" at once when they're
  wildly different sizes and the user is free to drag either
  independently. Every new way to misuse that mismatch was a new bug
  waiting to be found.
  <br><br>_Superseded by this ADR: the two prior fixes' anchor-edge-flipping
  and clamping logic (in `#anchorClamped`/`#repositionWithinViewport`) are
  removed here, replaced by `#anchorTo` operating on each element's own
  independent position — the anchor-edge-flipping half is kept (still a
  reasonable resize-resilience nicety), the clamping half is dropped per
  the next option._
- **Independent positions, but keep clamping each to the viewport
  (considered).** Would prevent a box from ever being dragged fully
  off-screen, at the cost of restricting a use case a user might
  genuinely want (e.g. temporarily shoving the panel out of the way).
  Rejected in favor of trusting the user once the cross-contamination
  risk that motivated clamping in the first place no longer exists.
- **Independent positions, no clamping (chosen).** Each element persists
  its own drag-updated inline position for as long as it exists (which is
  for the Widget's whole lifetime — both are created once and only
  toggled via `hidden`, never recreated), with no bound on where that can
  be. Simpler than either alternative, and directly closes the entire
  category of bug the shared-anchor design kept reopening.

## Consequences

- `#makeDraggable` takes an explicit `target` parameter (the element to
  reposition) instead of always moving the host — the toggle drags
  itself, the header drags the panel.
- The resize handle's `position: absolute` still anchors correctly to the
  panel, since `position: fixed` (like `relative`/`absolute`) establishes
  a containing block for absolutely-positioned descendants — no change
  needed there.
- A host page that scoped CSS to `:host { position: fixed; ... }` to
  override the Widget's placement would need to retarget `::part(toggle)`
  and `::part(panel)` instead. Not a concern in practice yet — nothing
  in `SPEC.md` documented `:host` positioning as part of the public
  contract, only that "a host can override the initial position via
  plain CSS," which already implies targeting the visible part.
