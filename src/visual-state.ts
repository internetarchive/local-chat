import { resolveStorageScope } from './storage-scope.js'

export interface Position {
  left: string
  right: string
  top: string
  bottom: string
}

export interface Size {
  width: string
  height: string
}

export interface VisualState {
  collapsed?: boolean
  togglePosition?: Position
  panelPosition?: Position
  panelSize?: Size
}

const SCHEMA_VERSION = 1
const STORAGE_PREFIX = 'local-chat:visual-state:'

interface StoredVisualState {
  version: number
  state: VisualState
}

function storageKeyFor(key: string): string {
  return `${STORAGE_PREFIX}${resolveStorageScope(key)}`
}

/**
 * Reads whichever Visual state fields were ever persisted for `key` -- each
 * one absent until the user actually drags, resizes, or toggles for the
 * first time in this scope. Any storage failure or unparseable/incompatible
 * data (including a schema-version mismatch) is treated as nothing
 * persisted, same reasoning as History's readHistory.
 */
export function readVisualState(key: string): VisualState {
  try {
    const raw = sessionStorage.getItem(storageKeyFor(key))
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const stored = parsed as StoredVisualState
    if (stored.version !== SCHEMA_VERSION || typeof stored.state !== 'object' || stored.state === null) return {}
    return stored.state
  } catch {
    return {}
  }
}

/**
 * Merges `patch` into whatever's already persisted for `key` -- writing only
 * the one field a given user action just touched (a drag, a resize, a
 * toggle) without clobbering the others. Silently does nothing on any
 * storage failure, same reasoning as readVisualState.
 */
export function writeVisualState(key: string, patch: Partial<VisualState>): void {
  try {
    const updated: VisualState = { ...readVisualState(key), ...patch }
    const payload: StoredVisualState = { version: SCHEMA_VERSION, state: updated }
    sessionStorage.setItem(storageKeyFor(key), JSON.stringify(payload))
  } catch {
    // Storage failures are never the chat's problem -- see readVisualState.
  }
}
