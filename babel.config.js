const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
        },
      },
    ],
    // Strip all console.* calls from production bundles
    ...(isProd ? ['transform-remove-console'] : []),
  ],
};
