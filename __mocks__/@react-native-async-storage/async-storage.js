/**
 * Automatic Jest mock for @react-native-async-storage/async-storage.
 * Placed in __mocks__/ at the project root so Jest uses it automatically
 * for all test files without requiring per-file jest.mock() calls.
 */

const store = new Map();

const AsyncStorage = {
  getItem: jest.fn(key => Promise.resolve(store.get(key) ?? null)),
  setItem: jest.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn(key => {
    store.delete(key);
    return Promise.resolve();
  }),
  multiGet: jest.fn(keys => Promise.resolve(keys.map(k => [k, store.get(k) ?? null]))),
  multiSet: jest.fn(pairs => {
    pairs.forEach(([k, v]) => store.set(k, v));
    return Promise.resolve();
  }),
  multiRemove: jest.fn(keys => {
    keys.forEach(k => store.delete(k));
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
  /** Test-only helper: reset the in-memory store and clear call counts. */
  _reset() {
    store.clear();
    Object.values(AsyncStorage)
      .filter(v => typeof v?.mockReset === 'function')
      .forEach(fn => fn.mockReset());
    // Re-bind implementations after mockReset clears them
    AsyncStorage.getItem.mockImplementation(key => Promise.resolve(store.get(key) ?? null));
    AsyncStorage.setItem.mockImplementation((key, value) => {
      store.set(key, value);
      return Promise.resolve();
    });
    AsyncStorage.removeItem.mockImplementation(key => {
      store.delete(key);
      return Promise.resolve();
    });
    AsyncStorage.clear.mockImplementation(() => {
      store.clear();
      return Promise.resolve();
    });
    AsyncStorage.getAllKeys.mockImplementation(() => Promise.resolve([...store.keys()]));
  },
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
