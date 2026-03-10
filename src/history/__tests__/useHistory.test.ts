/**
 * Tests for useHistory hook.
 *
 * Uses @testing-library/react-native renderHook to exercise the hook
 * in a realistic component lifecycle.
 *
 * Coverage areas:
 *  §1  Initial load on mount
 *  §2  add() — optimistic prepend
 *  §3  remove() — optimistic removal
 *  §4  update() — in-place update
 *  §5  clear() — empties the list
 *  §6  refresh() — reloads from page 0
 *  §7  loadMore() — appends next page (hasMore guard)
 *
 * Imports through the barrel (src/history/index.ts) to cover it.
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHistory, HistoryManager } from '@/history';

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  (AsyncStorage as any)._reset();
  HistoryManager.invalidateCache();
});

// ─────────────────────────────────────────────────────────────────────────────
// §1  Initial load
// ─────────────────────────────────────────────────────────────────────────────

describe('useHistory — initial load', () => {
  it('starts with isLoading = true then resolves', async () => {
    const { result } = renderHook(() => useHistory());
    // After the initial async load, isLoading should become false
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('starts with an empty entries list when storage is empty', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.entries).toHaveLength(0);
  });

  it('total is 0 when storage is empty', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.total).toBe(0);
  });

  it('hasMore is false for empty storage', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.hasMore).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §2  add()
// ─────────────────────────────────────────────────────────────────────────────

describe('useHistory — add()', () => {
  it('prepends the new entry to entries immediately', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.add('1 + 1', '2');
    });

    expect(result.current.entries[0].expression).toBe('1 + 1');
    expect(result.current.entries[0].result).toBe('2');
  });

  it('increments total after add', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.add('2 * 3', '6');
    });

    expect(result.current.total).toBe(1);
  });

  it('returns the persisted HistoryEntry', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let entry: Awaited<ReturnType<typeof result.current.add>>;
    await act(async () => {
      entry = await result.current.add('5^2', '25');
    });
    expect(entry!.expression).toBe('5^2');
    expect(entry!.result).toBe('25');
    expect(typeof entry!.id).toBe('string');
  });

  it('newest entry appears first with multiple adds', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.add('first', '1');
      await result.current.add('second', '2');
    });

    expect(result.current.entries[0].expression).toBe('second');
    expect(result.current.entries[1].expression).toBe('first');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3  remove()
// ─────────────────────────────────────────────────────────────────────────────

describe('useHistory — remove()', () => {
  it('removes the targeted entry', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let id!: string;
    await act(async () => {
      const entry = await result.current.add('to-be-removed', '99');
      id = entry.id;
    });

    await act(async () => {
      await result.current.remove(id);
    });

    expect(result.current.entries.find(e => e.id === id)).toBeUndefined();
  });

  it('decrements total after remove', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let id!: string;
    await act(async () => {
      const entry = await result.current.add('x', '0');
      id = entry.id;
    });
    const before = result.current.total;

    await act(async () => {
      await result.current.remove(id);
    });

    expect(result.current.total).toBe(before - 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4  update()
// ─────────────────────────────────────────────────────────────────────────────

describe('useHistory — update()', () => {
  it('updates expression and result of an existing entry in-place', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let id!: string;
    await act(async () => {
      const entry = await result.current.add('old-expr', 'old-result');
      id = entry.id;
    });

    await act(async () => {
      await result.current.update(id, 'new-expr', 'new-result');
    });

    const updated = result.current.entries.find(e => e.id === id);
    expect(updated?.expression).toBe('new-expr');
    expect(updated?.result).toBe('new-result');
  });

  it('does not change total when updating', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    let id!: string;
    await act(async () => {
      const entry = await result.current.add('expr', '1');
      id = entry.id;
    });
    const before = result.current.total;

    await act(async () => {
      await result.current.update(id, 'expr2', '2');
    });

    expect(result.current.total).toBe(before);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §5  clear()
// ─────────────────────────────────────────────────────────────────────────────

describe('useHistory — clear()', () => {
  it('empties entries', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.add('a', '1');
      await result.current.add('b', '2');
    });

    await act(async () => {
      await result.current.clear();
    });

    expect(result.current.entries).toHaveLength(0);
  });

  it('resets total to 0', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.add('item', '1');
    });

    await act(async () => {
      await result.current.clear();
    });

    expect(result.current.total).toBe(0);
  });

  it('resets hasMore to false', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.clear();
    });

    expect(result.current.hasMore).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §6  refresh()
// ─────────────────────────────────────────────────────────────────────────────

describe('useHistory — refresh()', () => {
  it('reloads entries from storage', async () => {
    // Seed storage directly via HistoryManager
    await HistoryManager.add('direct-add', '99');

    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should have loaded the seeded entry on mount
    expect(result.current.entries.some(e => e.expression === 'direct-add')).toBe(true);

    // Now clear storage and refresh
    await HistoryManager.clearAll();
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.entries).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7  loadMore() — hasMore guard
// ─────────────────────────────────────────────────────────────────────────────

describe('useHistory — loadMore()', () => {
  it('does nothing when hasMore is false', async () => {
    const { result } = renderHook(() => useHistory());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const before = result.current.entries.length;
    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.entries.length).toBe(before);
  });

  it('loads the next page when hasMore is true', async () => {
    // Seed 25 entries with pageSize=20 so page 0 returns 20 and hasMore=true
    for (let i = 1; i <= 25; i++) {
      await HistoryManager.add(`entry-${i}`, `${i}`);
    }

    const { result } = renderHook(() => useHistory({ pageSize: 20 }));
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.entries.length).toBe(20);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.entries.length).toBe(25);
  });
});
