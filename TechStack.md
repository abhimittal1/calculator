# Tech Stack

Technology reference for the Calculator App — covers every library, tool, and pattern used in the codebase.

---

## 1. Core Runtime

| Technology       | Version              | Why It Is Used                                                                                                                            |
| ---------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **React Native** | 0.73.6               | Builds a native Android app from one TypeScript codebase. Compiles to real native views (not WebView).                                    |
| **React**        | 18.2.0               | Component model, hooks (`useState`, `useReducer`, `useMemo`, `useCallback`, `useRef`).                                                    |
| **TypeScript**   | 5.0.4                | Full strict-mode type safety across the entire codebase — catches errors before runtime.                                                  |
| **Hermes**       | bundled with RN 0.73 | Ahead-of-time compiled JS engine shipped with the APK. Cuts cold-start time and memory use on Android compared to the V8/JSC alternative. |

---

## 2. Navigation

| Package                          | Version | Role                                                                                        |
| -------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `@react-navigation/native`       | 6.1.17  | Navigation container, linking configuration, and hooks (`useNavigation`, `useFocusEffect`). |
| `@react-navigation/native-stack` | 6.9.26  | Root stack with hardware-accelerated screen transitions via Android fragments.              |
| `@react-navigation/bottom-tabs`  | 6.6.1   | Bottom tab bar for the four main screens (Home, History, Graph, Settings).                  |
| `react-native-screens`           | 3.29.0  | Native screen container required by the native stack navigator.                             |
| `react-native-safe-area-context` | 4.10.1  | Correct insets for notched and gesture-nav Android devices.                                 |

**Navigation structure:**

```
RootNavigator (native stack)
 ├── MainTabs (bottom tabs)
 │    ├── Home      → HomeScreen → CalculatorHome
 │    ├── History   → HistoryScreen
 │    ├── Graph     → GraphScreen
 │    └── Settings  → SettingsScreen
 └── Details   → DetailsScreen
```

**Deep linking** is configured in `src/navigation/linking.ts`. URLs of the form `calculatorapp://calculate?expr=…` open the calculator with a pre-loaded expression.

---

## 3. State Management

| Technology                   | Version  | Where Used           | Role                                                                              |
| ---------------------------- | -------- | -------------------- | --------------------------------------------------------------------------------- |
| **Zustand**                  | ^5.0.11  | `src/store/`         | Lightweight global state with minimal boilerplate. Two stores are used.           |
| Zustand `persist` middleware | bundled  | `settingsStore.ts`   | Serialises settings to AsyncStorage on every change and rehydrates on cold start. |
| **React `useReducer`**       | built-in | `CalculatorHome.tsx` | Calculator state machine (lhs / current / parenDepth / evaluated / error).        |
| **React `useState`**         | built-in | Screens and hooks    | Ephemeral local component state.                                                  |

### Stores

**`calculatorStore`** (in-memory only):

| Field        | Type             | Purpose                                          |
| ------------ | ---------------- | ------------------------------------------------ |
| `expression` | `string`         | Full expression string used by the graph plotter |
| `result`     | `string`         | Last evaluated result                            |
| `angleMode`  | `'rad' \| 'deg'` | Angle unit for trig functions                    |
| `precision`  | `number`         | Significant digits for `decimal.js` (default 12) |

**`settingsStore`** (persisted):

| Field           | Type      | Purpose                                 |
| --------------- | --------- | --------------------------------------- |
| `isDark`        | `boolean` | Dark mode override                      |
| `hapticEnabled` | `boolean` | Enable/disable vibration                |
| `soundEnabled`  | `boolean` | Enable/disable sound effects            |
| `saveHistory`   | `boolean` | Whether to save calculations to history |

---

## 4. Arithmetic Engine

| Technology        | Version                                | Role                                                                                                                                                                          |
| ----------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`decimal.js`**  | 10.6.0                                 | Arbitrary-precision arithmetic. Eliminates all IEEE-754 floating-point rounding errors (e.g. `0.1 + 0.2 === 0.3` is true with this library). Configurable significant digits. |
| **Custom parser** | internal (`src/engine/calc-engine.ts`) | Pure TypeScript pipeline: tokenizer → shunting-yard → AST builder → AST evaluator.                                                                                            |

**Engine pipeline:**

```
Source string
  → tokenize()        Lexer: numbers, operators, identifiers, parentheses
  → shuntingYard()    Dijkstra's algorithm: enforces precedence and associativity
  → buildAST()        Builds a typed ASTNode tree
  → evaluateAST()     Walks the tree with decimal.js arithmetic
  → Decimal result
```

**Supported:**

- Operators: `+`, `-`, `*`, `/`, `^`, `%`, unary `-` / `+`
- Functions: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `sqrt`, `cbrt`, `exp`, `pow`, `ln`, `log`, `log2`, `log10`, `abs`, `ceil`, `floor`, `round`, `sign`, `max`, `min`
- Constants: `pi`, `e`, `tau`, `phi`
- Angle modes: radians and degrees
- Parentheses (unlimited nesting)

---

## 5. Persistence

| Package                                     | Version | What Is Stored                                                                                                                               |
| ------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `@react-native-async-storage/async-storage` | ^1.24.0 | Calculation history (`@calculator/history_entries`) and Zustand settings (`@calculator/settings`). Key-value store, persisted on the device. |

**`HistoryManager`** (`src/history/HistoryManager.ts`) serialises concurrent writes via a mutex promise chain so no two writes corrupt the stored JSON simultaneously.

---

## 6. Graphing and Media

| Package                       | Version | Role                                                                                  |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `react-native-charts-wrapper` | ^0.6.0  | Native Android `MPAndroidChart` binding. Renders the `LineChart` on the Graph screen. |
| `react-native-view-shot`      | ^4.0.3  | Captures the chart as a PNG via `captureRef()` for the export/share feature.          |

---

## 7. Networking and Offline

| Package                           | Version  | Role                                                                                                      |
| --------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `@react-native-community/netinfo` | ^12.0.1  | Detects network connectivity. `NetworkService.ts` wraps it and exposes `isOnline` + a subscriber pattern. |
| `SyncQueue`                       | internal | Queues operations that fail while offline and replays them when connectivity returns.                     |

---

## 8. Platform Services

| Package                        | Version | Role                                                                                                         |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------ |
| `react-native-haptic-feedback` | bundled | Vibration on key presses (mediumImpact on `=`, lightImpact on digits). Respects the `hapticEnabled` setting. |
| `@sentry/react-native`         | ^8.3.0  | Production crash reporting and session tracking. Wraps unhandled exceptions and error-boundary catches.      |

**Sentry integration points:**

| Location                          | What is captured                                        |
| --------------------------------- | ------------------------------------------------------- |
| `index.js` — `Sentry.init()`      | SDK bootstrapped before `AppRegistry`                   |
| `index.js` — `Sentry.wrap(App)`   | Top-level React Native error handler                    |
| `ErrorBoundary.componentDidCatch` | React component tree crashes                            |
| `HistoryManager.add()`            | Breadcrumb: last saved expression/result                |
| `evaluateAST()`                   | Breadcrumb: angle mode and precision at each evaluation |

---

## 9. Testing

| Tool                                | Version | Purpose                                                                  |
| ----------------------------------- | ------- | ------------------------------------------------------------------------ |
| **Jest**                            | 29.6.3  | Test runner with jsdom and React Native presets                          |
| **`@testing-library/react-native`** | 12.4.3  | Component rendering, user-interaction assertions, `fireEvent`, `waitFor` |

**Test coverage:** 489 tests across 18 suites covering the engine, history subsystem, all screens, both Zustand stores, services, and utilities.

**Native module mocks** in `__mocks__/`:

| Mock                              | Replaces                                                             |
| --------------------------------- | -------------------------------------------------------------------- |
| `async-storage.js`                | `@react-native-async-storage/async-storage` (in-memory Map)          |
| `netinfo.js`                      | `@react-native-community/netinfo` (controllable `isConnected` value) |
| `react-native-charts-wrapper.js`  | `LineChart`, `BarChart`, `PieChart` (plain `<View>` stubs)           |
| `react-native-haptic-feedback.js` | `HapticFeedback.trigger()` (jest.fn())                               |
| `react-native-view-shot.js`       | `captureRef()` (returns a dummy file URI)                            |
| `@sentry/react-native.js`         | All Sentry SDK exports (jest.fn() stubs)                             |

---

## 10. Code Quality and Git Hooks

| Tool            | Version | Purpose                                                                  |
| --------------- | ------- | ------------------------------------------------------------------------ |
| **ESLint**      | 8.57.0  | Static analysis using `@react-native` and `@typescript-eslint` rule sets |
| **Prettier**    | 3.2.5   | Deterministic code formatting                                            |
| **Husky**       | 9.0.11  | Git hooks manager                                                        |
| **lint-staged** | 15.2.2  | Runs ESLint + Prettier only on staged files (fast pre-commit)            |

**Git hook behaviour:**

| Hook         | Command                          | Blocks commit/push if                                |
| ------------ | -------------------------------- | ---------------------------------------------------- |
| `pre-commit` | `npx lint-staged`                | ESLint errors or Prettier violations on staged files |
| `pre-push`   | `npm run type-check && npm test` | TypeScript errors or test failures                   |

---

## 11. Build and Distribution

| Technology                   | Version         | Role                                                                                      |
| ---------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| **Gradle**                   | 8.3             | Android build orchestration                                                               |
| **Android Gradle Plugin**    | 8.x             | Compiles, packages, and signs APK / AAB                                                   |
| **JDK 17 (Eclipse Temurin)** | 17.0.18         | Required by Gradle 8 and React Native 0.73+                                               |
| **ProGuard / R8**            | bundled         | Release build shrinking and obfuscation (rules in `android/app/proguard-rules.pro`)       |
| **Babel**                    | 7.x             | Transpiles TypeScript/JSX and resolves `@/` path alias via `babel-plugin-module-resolver` |
| **Metro**                    | bundled with RN | JavaScript bundler that Hot-Reloads changes during development                            |

---

## 12. Path Alias

All source imports use the `@/` alias which resolves to `src/`:

```ts
import { evaluate } from '@/engine/calc-engine';
import { useHistory } from '@/history';
import { useTheme } from '@/theme';
```

This alias is configured in three places so every tool resolves it consistently:

| File              | Setting                         |
| ----------------- | ------------------------------- |
| `tsconfig.json`   | `"paths": { "@/*": ["src/*"] }` |
| `babel.config.js` | `babel-plugin-module-resolver`  |
| `metro.config.js` | `resolver.extraNodeModules`     |

---

## 13. Developer Environment Baseline

| Requirement      | Version                                                       |
| ---------------- | ------------------------------------------------------------- |
| Node.js          | 18+                                                           |
| npm              | 9+                                                            |
| JDK              | 17 (Temurin recommended)                                      |
| Android SDK      | API 33+                                                       |
| Android Emulator | 1 AVD                                                         |
| OS               | Windows 10/11 (scripts), macOS (buildable), Linux (buildable) |

Verify your environment:

```bash
node -v          # must be 18+
java -version    # must show 17.x
adb version      # must be found on PATH
npx react-native doctor   # checks all RN dependencies
```
