---
status: accepted
---

# Light/dark mode via prefers-color-scheme, with a private-property indirection to avoid a specificity regression

Every color-bearing style already flowed through an overridable
`var(--local-chat-x, fallback)` custom property, but the fallback itself was
a single hardcoded light value — the Widget never adapted to the OS/
browser's dark-mode preference, and a host had to hand-roll a full dark
palette themselves (overriding every `--local-chat-x` property) to get one.

## Decision

Ship a built-in dark palette via `@media (prefers-color-scheme: dark)`,
plus a `color-scheme` attribute/property (reflected, values `"light"` /
`"dark"`) for a host to force either mode regardless of the OS preference —
needed for a host with their own light/dark toggle (e.g. driven by a class
on `<html>`, not the OS setting) who wants the Widget to follow that
instead. The Widget's own native CSS `color-scheme` property is set to
match, so browser-drawn chrome inside the shadow root (the transcript's
scrollbar, the input's caret/selection) doesn't visually clash with an
otherwise-correctly-themed dark panel.

The mechanism never defines a public `--local-chat-x` property itself.
Instead, each themed color gets a private counterpart (`--_local-chat-x`,
underscore-prefixed to signal "internal, not part of the public API") that
the component fully owns and switches between light/dark; every `var()`
usage becomes a two-level fallback: `var(--local-chat-x, var(--_local-chat-x))`.
The host's own override — the only thing that can ever set the public
property name — still trivially wins, exactly as before this change.

Accent (`--local-chat-accent`/`--local-chat-accent-color`) is deliberately
left alone: a saturated blue reads acceptably against both a light and a
dark surface, and nothing in the design called for a second accent pair.

## Considered Options

- **Define `--local-chat-x` directly on `:host`, switched via `@media`
  (rejected).** The naive approach. `:host { }` is a pseudo-class rule
  (specificity (0,1,0)), which beats a host page's own plain type-selector
  rule targeting the element (`local-chat { --local-chat-background: ... }`,
  specificity (0,0,1)) — meaning our own internal default would silently
  win over an existing host customization. Not hypothetical: query-shaper's
  own docs page already ships `local-chat { --local-chat-accent: #333; }`;
  this approach would have broken it with no attribute rename or migration
  note to point at, unlike this project's other breaking changes.
- **Private-property indirection (chosen).** Never defines the public
  property at any specificity, so there's no competing declaration to lose
  against — a host's override is the only declaration for that property
  name, same as before this change entirely. Costs one extra custom
  property and one extra fallback level per themed color; buys a
  correctness guarantee that nothing reading `--local-chat-x` today can
  regress.
- **Auto-bridge from a host's own dark-mode convention (e.g. a `.dark`
  class on `<html>`) (rejected).** No single convention dominates enough
  to guess at (Tailwind's `.dark` class, `data-theme`, `data-mode`, and
  others all coexist) — guessing wrong is worse than requiring explicit
  wiring. A host with their own toggle sets `color-scheme` from their own
  toggle handler instead, the same way any other host-driven state gets
  wired into the Widget today.
- **JS-computed theme via `matchMedia`, toggling a class (rejected).**
  Works, but trades a pure-CSS mechanism (auto-updates live on an OS
  preference change with zero JS) for a `MediaQueryList` listener with no
  corresponding benefit here.

## Consequences

- Every themed color property (`background`, `color`, `border-color`,
  `assistant-background`, `code-background`, plus the new `shadow-color`)
  gains a private `--_local-chat-x` counterpart, set on `:host` (light) and
  re-set inside `@media (prefers-color-scheme: dark) { :host(:not([color-scheme])) { } }`
  (dark, only when no explicit override) and inside
  `:host([color-scheme="dark"]) { }` (explicit override, any OS
  preference). `status-color` and the newer `empty-state-color` share one
  private dim-gray default (`--_local-chat-dim-color`) between them, since
  both start from the identical value in both modes.
- The OS-driven selector (`:host(:not([color-scheme]))`) and the explicit
  override selector (`:host([color-scheme="dark"])`) are mutually
  exclusive by construction (absence vs. presence of the same attribute) —
  no specificity tie-breaking needed between them, and no separate
  `color-scheme="light"` rule is needed either: with the attribute set to
  anything other than `"dark"`, both conditional rules are skipped and the
  plain `:host { }` light baseline applies on its own.
- New `--local-chat-shadow-color` custom property replaces the two
  previously-hardcoded `box-shadow` colors (the toggle's and the panel's),
  which differed only in blur/offset (geometry, not theme) and now share
  one color value each. Its dark default raises the alpha
  (`rgba(0, 0, 0, 0.25)` → `rgba(0, 0, 0, 0.5)`) rather than switching to a
  lighter tone, since a plain black shadow reads notably weaker once the
  page behind the Widget also tends dark.
- `colorScheme` is implemented as a directly-reflected property (get/set
  the `color-scheme` attribute verbatim), not the `#xOverride` field
  pattern the rest of the Widget's overridable properties use — those
  never need to affect a CSS selector, only a JS-read value, so a separate
  internal field made sense there. Here, the DOM attribute itself is what
  CSS keys off, so the property setter has to actually reflect it for a
  JS-set value to render at all.
- Follow-up fix, found via real-world use: Starter/Icebreaker/Followup
  pills and the status bar's download button both used to set `color` to
  `--local-chat-accent` directly, on top of a transparent background — a
  host's own page shows through, so pill text sits directly on the panel's
  current background. That's a fundamentally different usage than accent's
  other two jobs (a solid fill paired with `--local-chat-accent-color`,
  always self-contained contrast regardless of what either resolves to):
  a value chosen for good contrast against a light panel has no such
  guarantee against a dark one, or vice versa. Fixed by reusing
  `--local-chat-color` for pill text instead (already guaranteed to
  contrast with `--local-chat-background`, since that's its whole job) —
  the border alone still sets a pill apart from a plain message. The
  download button went the other way: reclassified as a solid accent fill
  like `send`, since it's a call-to-action (without it, the Widget never
  becomes usable) rather than a suggestion chip, sidestepping the same
  contrast risk entirely rather than working around it.
