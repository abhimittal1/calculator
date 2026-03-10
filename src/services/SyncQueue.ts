/**
 * SyncQueue
 *
 * Stores pending history operations (add / update / delete) in AsyncStorage
 * so they survive app restarts.  When NetworkService reports isOnline=true,
 * `SyncQueue.replay()` is called automatically to flush the queue against the
 * sync endpoint.
 *
 * The sync endpoint is intentionally left as a TODO — the queue mechanism is
 * fully built and tested independently of any real backend.
 *
 * Storage key: @calculator/sync_queue  (array of SyncOperation, serialised JSON)
 *
 * Usage:
 *   import {SyncQueue} from '@/services/SyncQueue';
 *   await SyncQueue.enqueue({ type: 'ADD', payload: entry });
 *   // When online:
 *   const results = await SyncQueue.replay();
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkService } from './NetworkService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SyncOperationType = 'ADD' | 'UPDATE' | 'DELETE';

export interface SyncOperation {
  /** Auto-assigned when enqueued. */
  id: string;
  type: SyncOperationType;
  /** The data to sync — shape depends on `type`. */
  payload: Record<string, unknown>;
  /** Unix ms timestamp when the operation was enqueued. */
  enqueuedAt: number;
  /** Number of replay attempts so far. */
  attempts: number;
}

export interface ReplayResult {
  succeeded: SyncOperation[];
  failed: SyncOperation[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = '@calculator/sync_queue';
const MAX_ATTEMPTS = 5;

/**
 * TODO: Replace with the real sync endpoint once a backend is available.
 *
 * The function should:
 *   - Accept a SyncOperation
 *   - POST/PATCH/DELETE to the appropriate REST route
 *   - Resolve on 2xx, reject on any other status
 */
async function _syncToBackend(_op: SyncOperation): Promise<void> {
  // Stub — always "succeeds" locally until a real endpoint is wired up.
  // In production replace with:
  //   const res = await fetch(`${API_BASE_URL}/history/${_op.type.toLowerCase()}`, {
  //     method: _op.type === 'DELETE' ? 'DELETE' : 'POST',
  //     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  //     body: JSON.stringify(_op.payload),
  //   });
  //   if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
  return Promise.resolve();
}

// ─── SyncQueue singleton ─────────────────────────────────────────────────────

class _SyncQueue {
  /** Whether a replay is currently in progress (prevents concurrent replays). */
  private _replaying = false;

  constructor() {
    // Automatically replay whenever the device comes back online.
    NetworkService.subscribe(isOnline => {
      if (isOnline) {
        this.replay().catch(() => {
          /* best-effort */
        });
      }
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _load(): Promise<SyncOperation[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyncOperation[];
  }

  private async _save(queue: SyncOperation[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }

  private _generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Add a new operation to the queue.
   * If the device is currently online, the replay is triggered immediately.
   */
  async enqueue(op: Pick<SyncOperation, 'type' | 'payload'>): Promise<SyncOperation> {
    const entry: SyncOperation = {
      id: this._generateId(),
      type: op.type,
      payload: op.payload,
      enqueuedAt: Date.now(),
      attempts: 0,
    };

    const queue = await this._load();
    queue.push(entry);
    await this._save(queue);

    if (NetworkService.isOnline) {
      this.replay().catch(() => {
        /* best-effort */
      });
    }

    return entry;
  }

  /**
   * Remove a single operation by id.
   * Returns true if the operation was found and removed.
   */
  async dequeue(id: string): Promise<boolean> {
    const queue = await this._load();
    const filtered = queue.filter(op => op.id !== id);
    if (filtered.length === queue.length) return false;
    await this._save(filtered);
    return true;
  }

  /** Return a snapshot of the current queue without modifying it. */
  async peek(): Promise<SyncOperation[]> {
    return this._load();
  }

  /** Drop every entry in the queue. */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Attempt to send all queued operations to the backend.
   *
   * - Operations that succeed are removed from the queue.
   * - Operations that fail have their `attempts` counter incremented.
   * - Operations that exceed MAX_ATTEMPTS are permanently dropped (dead-letter).
   *
   * Concurrent calls are coalesced — only one replay runs at a time.
   */
  async replay(): Promise<ReplayResult> {
    if (this._replaying) return { succeeded: [], failed: [] };
    this._replaying = true;

    const result: ReplayResult = { succeeded: [], failed: [] };

    try {
      const queue = await this._load();
      if (queue.length === 0) return result;

      const remaining: SyncOperation[] = [];

      for (const op of queue) {
        if (!NetworkService.isOnline) {
          // Connection dropped mid-replay — stop and keep unsent ops
          remaining.push(op);
          continue;
        }

        try {
          await _syncToBackend(op);
          result.succeeded.push(op);
        } catch {
          const updated: SyncOperation = { ...op, attempts: op.attempts + 1 };
          if (updated.attempts >= MAX_ATTEMPTS) {
            // Dead-letter: discard after too many failures
            result.failed.push(updated);
          } else {
            remaining.push(updated);
          }
        }
      }

      await this._save(remaining);
    } finally {
      this._replaying = false;
    }

    return result;
  }
}

export const SyncQueue = new _SyncQueue();
