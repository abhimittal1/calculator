/**
 * NetworkService
 *
 * Singleton that wraps @react-native-community/netinfo behind a simple
 * EventEmitter-style API.
 *
 * Usage:
 *   import {NetworkService} from '@/services/NetworkService';
 *
 *   // Read current state synchronously
 *   const online = NetworkService.isOnline;
 *
 *   // Subscribe to changes
 *   const unsub = NetworkService.subscribe((online) => {
 *     console.log('network is now', online ? 'online' : 'offline');
 *   });
 *   // Later:
 *   unsub();
 */

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

type Listener = (isOnline: boolean) => void;

class _NetworkService {
  private _isOnline = true;
  private _listeners = new Set<Listener>();
  private _unsubscribe: (() => void) | null = null;

  /** Whether the device currently has internet connectivity. */
  get isOnline(): boolean {
    return this._isOnline;
  }

  /**
   * Start watching connectivity. Called once from App.tsx on mount.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  start(): void {
    if (this._unsubscribe) return;

    // Fetch the current state immediately so `isOnline` is accurate
    // before the first event fires.
    NetInfo.fetch()
      .then(state => {
        this._handleChange(state);
      })
      .catch(() => {
        /* retain default true */
      });

    this._unsubscribe = NetInfo.addEventListener(state => {
      this._handleChange(state);
    });
  }

  /** Stop watching. Clears all listeners. */
  stop(): void {
    this._unsubscribe?.();
    this._unsubscribe = null;
    this._listeners.clear();
  }

  /**
   * Subscribe to connectivity changes.
   * @returns An unsubscribe function.
   */
  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _handleChange(state: NetInfoState): void {
    const online = state.isConnected === true && state.isInternetReachable !== false;

    if (online !== this._isOnline) {
      this._isOnline = online;
      this._listeners.forEach(l => l(online));
    }
  }
}

export const NetworkService = new _NetworkService();
