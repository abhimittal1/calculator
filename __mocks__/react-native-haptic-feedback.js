/**
 * Manual Jest mock for react-native-haptic-feedback.
 * The native module is not available in the Node.js test environment,
 * so we replace it with a no-op spy implementation.
 */
const ReactNativeHapticFeedback = {
  trigger: jest.fn(),
};

module.exports = ReactNativeHapticFeedback;
module.exports.default = ReactNativeHapticFeedback;
