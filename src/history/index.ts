/**
 * @module history
 *
 * Calculation history subsystem.
 *
 * Public surface:
 * - {@link HistoryManager} — singleton AsyncStorage-backed service
 * - {@link useHistory}     — React hook for read / paginate / mutate
 * - Types: {@link HistoryEntry}, {@link PageRequest}, {@link PageResult}
 */

export { HistoryManager } from './HistoryManager';
export { useHistory } from './useHistory';
export type { UseHistoryOptions, UseHistoryResult } from './useHistory';
export type { HistoryEntry, PageRequest, PageResult } from './types';
