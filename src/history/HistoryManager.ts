/**
 * @module history/HistoryManager
 *
 * Singleton service that persists calculation history to AsyncStorage.
 *
 * Storage format
 * ─────────────
 * A single AsyncStorage key (`@calculator/history_entries`) holds a JSON-
 * serialised `HistoryEntry[]` sorted *newest-first*.  For v1 the entire array
 * is loaded on first access and kept in an in-memory cache; writes flush the
 * full array back.  A future SQLite migration can keep the same public API.
 *
 * @example
 * ```ts
 * import {HistoryManager} from '@/history';
 *
 * await HistoryManager.add('3 + 5', '8');
 * const page = await HistoryManager.getPage({page: 0, pageSize: 20});
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import type { HistoryEntry, PageRequest, PageResult } from './types';
import { addBreadcrumb } from '@/services/SentryService';

// ─── Simple UUID v4 (no dependency) ──────────────────────────────────────────

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Service ─────────────────────────────────────────────────────────────────

class _HistoryManager {
  /** In-memory cache — null means not yet hydrated from storage. */
  private _cache: HistoryEntry[] | null = null;
  /** Serialises concurrent writes. */
  private _writeLock: Promise<void> = Promise.resolve();

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Load entries from AsyncStorage, populating the cache if needed. */
  private async _load(): Promise<HistoryEntry[]> {
    if (this._cache !== null) {
      return this._cache;
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY_ENTRIES);
      this._cache = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    } catch {
      this._cache = [];
    }
    return this._cache;
  }

  /** Persist the current cache to AsyncStorage (must hold write lock). */
  private async _flush(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORY_ENTRIES, JSON.stringify(this._cache ?? []));
    } catch (e) {
      // Non-fatal — keep serving from cache
      console.warn('[HistoryManager] flush failed:', e);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Add a new history entry (newest-first order).
   * Returns the created entry.
   *
   * Mutex pattern — each write method:
   *   (a) replaces _writeLock with a new pending promise BEFORE any await,
   *       so subsequent callers queue behind it immediately.
   *   (b) awaits the PREVIOUS lock so writes are serialised.
   *   (c) resolves the new lock in finally so the next queued write proceeds.
   */
  async add(expression: string, result: string): Promise<HistoryEntry> {
    const entry: HistoryEntry = {
      id: uuid(),
      expression,
      result,
      timestamp: Date.now(),
    };
    // Breadcrumb lets Sentry show the last saved calculation before a crash.
    addBreadcrumb({
      category: 'history',
      message: 'Calculation saved',
      level: 'info',
      data: { expression, result },
    });
    const prev = this._writeLock; // (a) capture current lock
    let releaseLock!: () => void;
    this._writeLock = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    await prev; // (b) wait for previous operation
    try {
      const entries = await this._load();
      this._cache = [entry, ...entries];
      await this._flush();
    } finally {
      releaseLock(); // (c) unblock the next waiter
    }
    return entry;
  }

  /**
   * Return a page of history entries (newest-first).
   */
  async getPage({ page, pageSize }: PageRequest): Promise<PageResult> {
    const entries = await this._load();
    const start = page * pageSize;
    const slice = entries.slice(start, start + pageSize);
    return {
      entries: slice,
      hasMore: start + pageSize < entries.length,
      total: entries.length,
    };
  }

  /**
   * Return all entries (newest-first) without pagination.
   * Prefer `getPage` for large datasets.
   */
  async getAll(): Promise<HistoryEntry[]> {
    return this._load();
  }

  /**
   * Delete a single entry by id.
   * No-op if the id is not found.
   */
  async remove(id: string): Promise<void> {
    const prev = this._writeLock;
    let releaseLock!: () => void;
    this._writeLock = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    await prev;
    try {
      const entries = await this._load();
      this._cache = entries.filter(e => e.id !== id);
      await this._flush();
    } finally {
      releaseLock();
    }
  }

  /**
   * Delete all history entries.
   */
  async clearAll(): Promise<void> {
    const prev = this._writeLock;
    let releaseLock!: () => void;
    this._writeLock = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    await prev;
    try {
      this._cache = [];
      await this._flush();
    } finally {
      releaseLock();
    }
  }

  /**
   * Update the expression and result of an existing entry in-place.
   * The entry's `id` and `timestamp` are preserved.
   * Returns the updated entry, or `null` if the id was not found.
   */
  async update(id: string, expression: string, result: string): Promise<HistoryEntry | null> {
    let updated: HistoryEntry | null = null;
    const prev = this._writeLock;
    let releaseLock!: () => void;
    this._writeLock = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    await prev;
    try {
      const entries = await this._load();
      const idx = entries.findIndex(e => e.id === id);
      if (idx !== -1) {
        updated = { ...entries[idx], expression, result };
        this._cache = [...entries.slice(0, idx), updated, ...entries.slice(idx + 1)];
        await this._flush();
      }
    } finally {
      releaseLock();
    }
    return updated;
  }

  /**
   * Force-invalidate the in-memory cache and reset the write lock.
   * Useful in tests or after an external storage update.
   */
  invalidateCache(): void {
    this._cache = null;
    this._writeLock = Promise.resolve();
  }
}

/** Singleton instance — import and use directly. */
export const HistoryManager = new _HistoryManager();
