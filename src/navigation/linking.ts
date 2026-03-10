/**
 * React Navigation deep link / linking configuration.
 *
 * URL scheme:  calculatorapp://
 *
 * Supported URLs:
 *   calculatorapp://calculate?expr=1%2B2   → Home tab, expr param passed
 *   calculatorapp://history                → History tab
 *
 * The `expr` query parameter is validated by deepLinkParser in CalculatorHome
 * before being dispatched to the engine.
 *
 * Usage: pass this object as the `linking` prop of <NavigationContainer>.
 */

import type { LinkingOptions } from '@react-navigation/native';
import { Linking } from 'react-native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  /**
   * The URL prefixes this app responds to.
   * React Navigation will only handle URLs that start with one of these.
   */
  prefixes: ['calculatorapp://'],

  /**
   * Custom `getInitialURL` so we can intercept the cold-start deep link.
   * Falls back to the OS-provided initial URL.
   */
  async getInitialURL() {
    return Linking.getInitialURL();
  },

  /**
   * Subscribe to URL events arriving while the app is already open
   * (warm deep links).
   */
  subscribe(listener) {
    const sub = Linking.addEventListener('url', ({ url }) => listener(url));
    return () => sub.remove();
  },

  config: {
    screens: {
      /**
       * MainTabs is the root stack screen that wraps the tab navigator.
       * Deep links target screens nested inside it.
       */
      MainTabs: {
        screens: {
          /**
           * calculatorapp://calculate?expr=1%2B2
           *
           * React Navigation automatically decodes percent-encoded characters
           * and delivers the decoded value as `route.params.expr` on the Home
           * screen.  CalculatorHome validates the value with deepLinkParser
           * before use.
           */
          Home: {
            path: 'calculate',
            parse: {
              // Keep expr as a plain string; validation happens in the screen.
              expr: (value: string) => value,
            },
          },
          /** calculatorapp://history */
          History: 'history',
        },
      },
    },
  },
};
