import { afterEach } from 'vitest'

// vitest's jsdom environment fails to expose a working `localStorage` global
// on Node 26+ (its own experimental native `localStorage` global appears to
// shadow vitest's attempt to proxy jsdom's own, working implementation onto
// the same property) -- jsdom's Storage instance itself is fine and reachable
// via the `jsdom` global vitest exposes, so this just re-points the global
// property at it directly.
const jsdomGlobal = (globalThis as { jsdom?: { window: Window } }).jsdom
if (jsdomGlobal) {
  Object.defineProperty(globalThis, 'localStorage', {
    get: () => jsdomGlobal.window.localStorage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    get: () => jsdomGlobal.window.sessionStorage,
    configurable: true,
  })
}

// Every test file shares one jsdom/localStorage instance across its own
// `it` blocks (isolation is per-file, not per-test) -- persisted History
// writes now a real side effect of sending a message, so without this, an
// Exchange written in one test would leak into and change the behavior of
// another later test in the same file that also expands the widget.
afterEach(() => {
  localStorage.clear()
})
