/**
 * Manual Jest mock for react-native-view-shot.
 * Returns a fake file URI so tests don't need a real native View to capture.
 */
const viewShot = {
  captureRef: jest.fn(() => Promise.resolve('file:///mock/screenshot.png')),
  captureScreen: jest.fn(() => Promise.resolve('file:///mock/screenshot.png')),
};

module.exports = viewShot;
module.exports.default = viewShot;
module.exports.captureRef = viewShot.captureRef;
module.exports.captureScreen = viewShot.captureScreen;
