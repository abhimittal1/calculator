/**
 * @module history/useHistory
 *
 * React hook that exposes paginated access to calculation history.
 *
 * @example
 * ```tsx
 * const {entries, hasMore, loadMore, add, remove, clear, isLoading} = useHistory();
 *
 * // Save after evaluation
 * await add('3 + 5', '8');
 *
 * // Infinite-scroll
 * <FlatList onEndReached={loadMore} ... />
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { HistoryManager } from './HistoryManager';
import type { HistoryEntry } from './types';

const DEFAULT_PAGE_SIZE = 20;

export interface UseHistoryOptions {
  /** How many entries to fetch per page. Defaults to 20. */
  pageSize?: number;
}

export interface UseHistoryResult {
  /** Currently loaded entries (newest-first). */
  entries: HistoryEntry[];
  /** Whether the initial load is in flight. */
  isLoading: boolean;
  /** Whether there are additional pages available. */
  hasMore: boolean;
  /** Total number of entries in storage. */
  total: number;
  /** Append the next page to `entries`. */
  loadMore: () => Promise<void>;
  /** Reload from page 0, discarding the current list. */
  refresh: () => Promise<void>;
  /**
   * Save a new entry and prepend it to the list immediately (optimistic).
   * Returns the persisted {@link HistoryEntry}.
   */
  add: (expression: string, result: string) => Promise<HistoryEntry>;
  /**
   * Remove a single entry by id.
   */
  remove: (id: string) => Promise<void>;
  /**
   * Update the expression and result of an entry in-place (optimistic).
   */
  update: (id: string, expression: string, result: string) => Promise<void>;
  /**
   * Delete all entries.
   */
  clear: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────

export function useHistory(options?: UseHistoryOptions): UseHistoryResult {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  /** Current page cursor — use ref to avoid stale-closure issues in loadMore. */
  const pageRef = useRef(0);
  /** Guard against concurrent loadMore calls. */
  const fetchingRef = useRef(false);

  const _fetchPage = useCallback(
    async (page: number, replace: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const result = await HistoryManager.getPage({ page, pageSize });
        setEntries(prev => (replace ? result.entries : [...prev, ...result.entries]));
        setHasMore(result.hasMore);
        setTotal(result.total);
        pageRef.current = page;
      } finally {
        fetchingRef.current = false;
        setIsLoading(false);
      }
    },
    [pageSize],
  );

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    _fetchPage(0, true);
  }, [_fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || fetchingRef.current) return;
    await _fetchPage(pageRef.current + 1, false);
  }, [hasMore, _fetchPage]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    HistoryManager.invalidateCache();
    await _fetchPage(0, true);
  }, [_fetchPage]);

  const add = useCallback(async (expression: string, result: string): Promise<HistoryEntry> => {
    const entry = await HistoryManager.add(expression, result);
    // Optimistic prepend — keeps the UI snappy without a round-trip
    setEntries(prev => [entry, ...prev]);
    setTotal(t => t + 1);
    return entry;
  }, []);

  const remove = useCallback(async (id: string) => {
    await HistoryManager.remove(id);
    setEntries(prev => prev.filter(e => e.id !== id));
    setTotal(t => Math.max(0, t - 1));
  }, []);

  const update = useCallback(async (id: string, expression: string, result: string) => {
    const updated = await HistoryManager.update(id, expression, result);
    if (updated) {
      setEntries(prev => prev.map(e => (e.id === id ? updated : e)));
    }
  }, []);

  const clear = useCallback(async () => {
    await HistoryManager.clearAll();
    setEntries([]);
    setHasMore(false);
    setTotal(0);
    pageRef.current = 0;
  }, []);

  return { entries, isLoading, hasMore, total, loadMore, refresh, add, remove, update, clear };
}
