// __mocks__/@sentry/react-native.js
//
// Jest mock for the Sentry React Native SDK.
// The real SDK links against native modules that are unavailable in the
// Node.js Jest environment, so we replace every export with a no-op stub.

const noOp = () => {};
const identity = x => x;

module.exports = {
  init: noOp,
  wrap: identity, // Sentry.wrap(Component) → Component
  captureException: noOp,
  captureMessage: noOp,
  addBreadcrumb: noOp,
  withScope: cb => cb({ setTag: noOp, setExtra: noOp, setContext: noOp }),
  setTag: noOp,
  setUser: noOp,
  setContext: noOp,
  setExtra: noOp,
  configureScope: noOp,
  startTransaction: () => ({ finish: noOp, setTag: noOp }),
  // React Navigation integration helpers
  createNavigationContainerRef: () => ({ current: null }),
  ReactNavigationInstrumentation: class {},
  ReactNativeTracing: class {},
  // Constants
  Severity: {
    Fatal: 'fatal',
    Error: 'error',
    Warning: 'warning',
    Info: 'info',
    Debug: 'debug',
    Log: 'log',
  },
};
