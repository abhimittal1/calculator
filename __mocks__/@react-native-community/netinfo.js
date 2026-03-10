/**
 * Manual Jest mock for @react-native-community/netinfo.
 * Tests can override `_mockState` and call `_emit()` to simulate
 * connectivity changes.
 */

let _listeners = [];
let _mockState = { isConnected: true, isInternetReachable: true };

const NetInfo = {
  // ── State control (test helpers) ─────────────────────────────────────────
  _mockState,

  /** Simulate a connectivity change from tests. */
  _emit(state) {
    _mockState = state;
    _listeners.forEach(l => l(state));
  },

  /** Reset to defaults between tests. */
  _reset() {
    _listeners = [];
    _mockState = { isConnected: true, isInternetReachable: true };
  },

  // ── NetInfo API surface ──────────────────────────────────────────────────
  fetch: jest.fn(() => Promise.resolve(_mockState)),

  addEventListener: jest.fn(listener => {
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter(l => l !== listener);
    };
  }),
};

module.exports = NetInfo;
module.exports.default = NetInfo;
