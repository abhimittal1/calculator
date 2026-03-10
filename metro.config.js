const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * The extraNodeModules resolver mirrors the @/ alias defined in
 * babel.config.js (babel-plugin-module-resolver) and tsconfig.json (paths).
 */
const config = {
  resolver: {
    extraNodeModules: {
      '@': path.resolve(__dirname, 'src'),
    },
    // Prevent Metro from trying to read zip/binary archives dropped in the project root
    blockList: [/.*\.zip$/, /.*\.tar$/, /.*\.gz$/],
  },
  watchFolders: [path.resolve(__dirname, 'src')],
};

module.exports = mergeConfig(defaultConfig, config);
