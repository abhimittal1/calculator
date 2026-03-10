import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { initSentry, sentryWrap } from './src/services/SentryService';

// Initialise Sentry before any component mounts so every crash — including
// those that occur during the first render — is captured.
initSentry();

// Sentry.wrap gives the SDK a top-level error handler and performance tracing
// that works even before React Navigation is mounted.
AppRegistry.registerComponent(appName, () => sentryWrap(App));
