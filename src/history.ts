import { resolveStorageScope } from './storage-scope.js'

export interface Exchange {
  user: string
  assistant: string
}

const SCHEMA_VERSION = 1
const STORAGE_PREFIX = 'local-chat:history:'

interface StoredHistory {
  version: number
  exchanges: Exchange[]
}

function storageKeyFor(key: string): string {
  return `${STORAGE_PREFIX}${resolveStorageScope(key)}`
}

function isExchange(value: unknown): value is Exchange {
  return typeof value === 'object' && value !== null && typeof (value as Exchange).user === 'string' && typeof (value as Exchange).assistant === 'string'
}

/**
 * Reads persisted Exchanges for `key`, capped to the most recent `max`. Any
 * storage failure (quota, privacy mode blocking storage) or unparseable/
 * incompatible data (including a schema-version mismatch from a future
 * format change) is treated identically to no History existing at all --
 * this never throws, and never breaks the Widget over something that's
 * meant to be a nice-to-have.
 */
export function readHistory(key: string, max: number): Exchange[] {
  if (max === 0) return []
  try {
    const raw = localStorage.getItem(storageKeyFor(key))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return []
    const stored = parsed as StoredHistory
    if (stored.version !== SCHEMA_VERSION || !Array.isArray(stored.exchanges)) return []
    return stored.exchanges.filter(isExchange).slice(-max)
  } catch {
    return []
  }
}

/**
 * Appends a completed Exchange to History for `key`, dropping the oldest
 * entry first once `max` is exceeded -- a rolling window. Silently does
 * nothing on any storage failure, same reasoning as readHistory.
 */
export function appendExchange(key: string, exchange: Exchange, max: number): void {
  if (max === 0) return
  try {
    const updated = [...readHistory(key, max), exchange].slice(-max)
    const payload: StoredHistory = { version: SCHEMA_VERSION, exchanges: updated }
    localStorage.setItem(storageKeyFor(key), JSON.stringify(payload))
  } catch {
    // Storage failures are never the chat's problem -- see readHistory.
  }
}

/** Purges the persisted History entry for `key` (see Clear in CONTEXT.md). */
export function clearHistory(key: string): void {
  try {
    localStorage.removeItem(storageKeyFor(key))
  } catch {
    // Same as above.
  }
}
