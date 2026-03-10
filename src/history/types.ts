/**
 * @module history/types
 * Shared public types for the calculation history subsystem.
 */

// ─────────────────────────────────────────────────────────────────────────────

/** A single saved calculation. */
export interface HistoryEntry {
  /** Unique identifier (UUID v4 generated at insertion time). */
  id: string;
  /**
   * The expression as displayed to the user (pretty-printed operators).
   * e.g. "3 + 5", "sin(π/6)"
   */
  expression: string;
  /**
   * The result string as shown in the display at the time of evaluation.
   * Always a finite numeric string or "Error".
   */
  result: string;
  /** Unix timestamp (milliseconds) when the entry was created. */
  timestamp: number;
}

/** Pagination cursor passed to {@link HistoryManager.getPage}. */
export interface PageRequest {
  /** Zero-based page index. */
  page: number;
  /** Number of entries per page. */
  pageSize: number;
}

/** Result of a paginated query. */
export interface PageResult {
  entries: HistoryEntry[];
  /** Whether there are more pages after this one. */
  hasMore: boolean;
  /** Total number of entries in storage at query time. */
  total: number;
}
