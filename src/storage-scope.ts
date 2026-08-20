/**
 * Resolves a `storage-key` attribute value to the actual scope string used
 * to namespace persisted data. Shared by History (`localStorage`) and Visual
 * state (`sessionStorage`) -- both scope identically, so one attribute and
 * one resolution function serve both rather than two nearly-identical ones.
 */
export function resolveStorageScope(value: string): string {
  switch (value) {
    case 'origin':
      return 'origin'
    case 'path':
      return location.pathname
    case 'url':
      return `${location.pathname}${location.search}`
    default:
      return value
  }
}
