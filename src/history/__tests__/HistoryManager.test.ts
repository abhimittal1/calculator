/**
 * Tests for HistoryManager service.
 *
 * AsyncStorage is automatically mocked via __mocks__/@react-native-async-storage/async-storage.js
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Import under test ────────────────────────────────────────────────────────

import { HistoryManager } from '@/history/HistoryManager';

// ─────────────────────────────────────────────────────────────────────────────

describe('HistoryManager', () => {
  beforeEach(() => {
    (AsyncStorage as any)._reset();
    HistoryManager.invalidateCache();
  });

  // ── add ───────────────────────────────────────────────────────────────────

  describe('add()', () => {
    it('returns a HistoryEntry with the given expression and result', async () => {
      const entry = await HistoryManager.add('3 + 5', '8');
      expect(entry.expression).toBe('3 + 5');
      expect(entry.result).toBe('8');
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.timestamp).toBe('number');
    });

    it('prepends new entries (newest-first order)', async () => {
      await HistoryManager.add('1 + 1', '2');
      await HistoryManager.add('2 + 2', '4');
      const { entries } = await HistoryManager.getPage({ page: 0, pageSize: 10 });
      expect(entries[0].result).toBe('4');
      expect(entries[1].result).toBe('2');
    });

    it('persists entries to AsyncStorage', async () => {
      await HistoryManager.add('10 × 3', '30');
      // Invalidate cache and re-load from storage
      HistoryManager.invalidateCache();
      const { entries } = await HistoryManager.getPage({ page: 0, pageSize: 10 });
      expect(entries).toHaveLength(1);
      expect(entries[0].expression).toBe('10 × 3');
    });

    it('saves all 10 entries added in rapid succession', async () => {
      for (let i = 1; i <= 10; i++) {
        await HistoryManager.add(`rapid-${i}`, `${i}`);
      }
      // Bypass cache — re-read raw from AsyncStorage to confirm persistence
      HistoryManager.invalidateCache();
      const all = await HistoryManager.getAll();
      expect(all).toHaveLength(10);
      // Entries are stored newest-first, so rapid-10 is first
      expect(all[0].expression).toBe('rapid-10');
      expect(all[9].expression).toBe('rapid-1');
    });

    it('saves all 10 entries added concurrently (no await between calls)', async () => {
      // Fire all 10 adds without awaiting — this exercises the write-lock
      // mutex; without the fix only the last flush would survive.
      const promises = Array.from({ length: 10 }, (_, i) =>
        HistoryManager.add(`concurrent-${i + 1}`, `${i + 1}`),
      );
      await Promise.all(promises);

      // Bypass cache and verify all 10 made it to storage
      HistoryManager.invalidateCache();
      const all = await HistoryManager.getAll();
      expect(all).toHaveLength(10);

      const expressions = all.map(e => e.expression);
      for (let i = 1; i <= 10; i++) {
        expect(expressions).toContain(`concurrent-${i}`);
      }
    });
  });

  // ── getPage ───────────────────────────────────────────────────────────────

  describe('getPage()', () => {
    beforeEach(async () => {
      // Insert 25 entries
      for (let i = 1; i <= 25; i++) {
        await HistoryManager.add(`expr-${i}`, `${i}`);
      }
    });

    it('returns first page correctly', async () => {
      const page = await HistoryManager.getPage({ page: 0, pageSize: 10 });
      expect(page.entries).toHaveLength(10);
      expect(page.hasMore).toBe(true);
      expect(page.total).toBe(25);
    });

    it('returns last partial page correctly', async () => {
      const page = await HistoryManager.getPage({ page: 2, pageSize: 10 });
      expect(page.entries).toHaveLength(5);
      expect(page.hasMore).toBe(false);
    });

    it('returns empty entries for out-of-bounds page', async () => {
      const page = await HistoryManager.getPage({ page: 99, pageSize: 10 });
      expect(page.entries).toHaveLength(0);
      expect(page.hasMore).toBe(false);
    });
  });

  // ── getAll ────────────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('returns all entries', async () => {
      await HistoryManager.add('1+1', '2');
      await HistoryManager.add('2+2', '4');
      const all = await HistoryManager.getAll();
      expect(all).toHaveLength(2);
    });

    it('returns an empty array when storage is empty', async () => {
      const all = await HistoryManager.getAll();
      expect(all).toEqual([]);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('removes the entry with the given id', async () => {
      const e1 = await HistoryManager.add('1+1', '2');
      await HistoryManager.add('2+2', '4');
      await HistoryManager.remove(e1.id);
      const all = await HistoryManager.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].result).toBe('4');
    });

    it('is a no-op for unknown ids', async () => {
      await HistoryManager.add('1+1', '2');
      await HistoryManager.remove('nonexistent-id');
      const all = await HistoryManager.getAll();
      expect(all).toHaveLength(1);
    });
  });

  // ── clearAll ──────────────────────────────────────────────────────────────

  describe('clearAll()', () => {
    it('removes all entries', async () => {
      await HistoryManager.add('1+1', '2');
      await HistoryManager.add('2+2', '4');
      await HistoryManager.clearAll();
      const all = await HistoryManager.getAll();
      expect(all).toEqual([]);
    });

    it('persists the empty state to storage', async () => {
      await HistoryManager.add('1+1', '2');
      await HistoryManager.clearAll();
      HistoryManager.invalidateCache();
      const all = await HistoryManager.getAll();
      expect(all).toEqual([]);
    });
  });

  // ── invalidateCache ───────────────────────────────────────────────────────

  describe('invalidateCache()', () => {
    it('forces a re-read from AsyncStorage on next call', async () => {
      await HistoryManager.add('5+5', '10');
      // Simulate an external write directly to AsyncStorage (bypass cache)
      const key = '@calculator/history_entries';
      const external = JSON.stringify([
        { id: 'ext-1', expression: 'ext', result: '99', timestamp: Date.now() },
      ]);
      await AsyncStorage.setItem(key, external);
      // Without cache invalidation the cached value is still returned
      const cached = await HistoryManager.getAll();
      expect(cached).toHaveLength(1);
      expect(cached[0].result).toBe('10');
      // After invalidation, HistoryManager re-reads storage
      HistoryManager.invalidateCache();
      const fresh = await HistoryManager.getAll();
      expect(fresh).toHaveLength(1);
      expect(fresh[0].result).toBe('99');
    });
  });
});
