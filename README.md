# Calculator App

A React Native + TypeScript mobile calculator with a full arithmetic engine, persistent history, graph plotting, settings, and offline-first architecture — targeted at Android.

---

## Table of Contents

1. [Requirements](#1-requirements)
2. [Quick Start](#2-quick-start)
3. [All Dev Commands](#3-all-dev-commands)
4. [Project Structure](#4-project-structure)
5. [How the App Works — Code Walkthrough](#5-how-the-app-works--code-walkthrough)
   - [App Entry & Provider Chain](#51-app-entry--provider-chain)
   - [Navigation](#52-navigation)
   - [Calculator Engine](#53-calculator-engine)
   - [Calculator UI — CalculatorHome](#54-calculator-ui--calculatorhome)
   - [History Subsystem](#55-history-subsystem)
   - [Graph Screen](#56-graph-screen)
   - [Settings Screen](#57-settings-screen)
   - [Theme System](#58-theme-system)
   - [Global State — Zustand Stores](#59-global-state--zustand-stores)
   - [Services](#510-services)
   - [Error Boundaries](#511-error-boundaries)
6. [Testing](#6-testing)
7. [Onboarding Checklist for Teammates](#7-onboarding-checklist-for-teammates)
8. [Troubleshooting](#8-troubleshooting)
9. [Publishing to GitHub](#9-publishing-to-github)
10. [Security Notes](#10-security-notes)

---

## 1. Requirements

| Tool           | Version      | Download                                        |
| -------------- | ------------ | ----------------------------------------------- |
| Node.js        | 18+          | https://nodejs.org                              |
| npm            | 9+           | bundled with Node                               |
| JDK            | 17 (Temurin) | `winget install EclipseAdoptium.Temurin.17.JDK` |
| Android Studio | latest       | https://developer.android.com/studio            |
| Git            | any          | https://git-scm.com                             |

> **Windows path expected by the launch scripts:**
> `C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot`
>
> If your JDK is in a different location, update `JAVA_HOME` in `dev-env.ps1` and `start.ps1`.

---

## 2. Quick Start

```powershell
# 1. Clone the repository
git clone <repo-url>
cd calculator

# 2. Install dependencies
npm install

# 3. Load environment variables (JAVA_HOME, ANDROID_HOME, adb)
. .\dev-env.ps1

# 4. Start an emulator in Android Studio, then run:
npm run android
```

### One-command launcher (recommended for first run)

```powershell
.\start.ps1
```

`start.ps1` automatically:

- Validates JDK 17 and Android SDK are present
- Starts an emulator if none is detected
- Launches Metro bundler in a separate window
- Builds and installs the APK on the device

---

## 3. All Dev Commands

```bash
npm start              # Start Metro bundler
npm run start:clean    # Start Metro with cleared cache
npm run android        # Build and install on Android
npm test               # Run all 489 tests
npm run lint           # Run ESLint
npm run lint:fix       # Run ESLint with auto-fix
npm run format         # Format all files with Prettier
npm run type-check     # TypeScript compile check (no emit)
npm run ci             # Full check: type-check + lint + test

npm run bundle:android # Build JS bundle for Android
npm run build:apk      # Build release APK
npm run build:aab      # Build release AAB (Play Store)
npm run clean:android  # Clean Gradle
```

---

## 4. Project Structure

```
calculator/
├── index.js                        App entry point (AppRegistry)
├── App.tsx                         Root component + provider chain
├── start.ps1                       One-command launcher (Windows)
├── dev-env.ps1                     Per-session environment variables
├── keystore.properties.example     Release signing template
├── src/
│   ├── engine/
│   │   └── calc-engine.ts          Full arithmetic engine (tokenizer → AST → evaluator)
│   ├── components/
│   │   ├── CalculatorHome.tsx      Calculator UI + useReducer state machine
│   │   ├── CalculatorKeypad.tsx    Memoized keypad grid (React.memo)
│   │   └── ErrorBoundary.tsx       Crash-catch class component
│   ├── screens/
│   │   ├── HomeScreen.tsx          Wraps CalculatorHome in ErrorBoundary
│   │   ├── HistoryScreen.tsx       History list (CRUD, pagination)
│   │   ├── GraphScreen.tsx         History chart + function plotter
│   │   ├── SettingsScreen.tsx      Toggles for theme/haptics/sound/history
│   │   └── DetailsScreen.tsx       Stack screen (item detail view)
│   ├── history/
│   │   ├── HistoryManager.ts       Singleton AsyncStorage service
│   │   ├── useHistory.ts           Paginated React hook
│   │   ├── types.ts                HistoryEntry, PageRequest, PageResult
│   │   └── index.ts                Public re-exports
│   ├── store/
│   │   ├── calculatorStore.ts      Zustand: expression, result, angleMode, precision
│   │   ├── settingsStore.ts        Zustand: isDark, haptic, sound, saveHistory (persisted)
│   │   └── index.ts                Re-exports
│   ├── services/
│   │   ├── NetworkService.ts       NetInfo: isOnline flag + subscriber pattern
│   │   ├── SyncQueue.ts            Offline-first operation queue
│   │   ├── SentryService.ts        Crash reporting wrapper
│   │   ├── HapticService.ts        Vibration wrapper
│   │   └── SoundService.ts         Sound effect stub
│   ├── navigation/
│   │   ├── index.tsx               Stack + tab navigators
│   │   ├── types.ts                Route param types
│   │   └── linking.ts              Deep-link URL config
│   ├── theme/
│   │   ├── colors.ts               Primitive colour palette
│   │   ├── spacing.ts              4-pt scale + border radii
│   │   ├── typography.ts           Font sizes, weights, line heights
│   │   └── index.tsx               ThemeProvider + useTheme + light/dark tokens
│   ├── constants/index.ts          Storage keys, z-index, animation durations
│   └── utils/deepLinkParser.ts     URL → calculator expression parser
├── __mocks__/                      Jest mocks for native modules
├── __tests__/App.test.tsx          Root smoke test
└── android/                        Native Android Gradle project
```

---

## 5. How the App Works — Code Walkthrough

### 5.1 App Entry & Provider Chain

**`index.js`** — The very first thing Android loads. It registers the `App` component with React Native's `AppRegistry`.

**`App.tsx`** — Root component. It chains three nested providers and initialises two services:

```
<SafeAreaProvider>          ← handles notch / status bar insets
  <ThemeProvider>           ← provides light/dark theme + toggleTheme()
    <OfflineBanner />       ← red bar when NetworkService.isOnline === false
    <NavigationRoot>        ← passes theme colours into NavigationContainer
      <ErrorBoundary>       ← top-level crash guard
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ErrorBoundary>
    </NavigationRoot>
  </ThemeProvider>
</SafeAreaProvider>
```

On mount, `App` calls `NetworkService.start()` (begins listening for connectivity changes) and `SyncQueue.replay()` (flushes any operations saved from previous offline sessions).

---

### 5.2 Navigation

**`src/navigation/index.tsx`** contains two navigators:

| Navigator                               | Type         | Screens                                |
| --------------------------------------- | ------------ | -------------------------------------- |
| `RootNavigator`                         | Native Stack | `MainTabs`, `Details`                  |
| `TabNavigator` (nested inside MainTabs) | Bottom Tabs  | `Home`, `History`, `Graph`, `Settings` |

**`src/navigation/types.ts`** defines the TypeScript types for every route and its parameters:

```ts
// Passing a value from HistoryScreen back to the calculator:
navigation.navigate('Home', { loadValue: '42' });

// Opening the Details screen from code:
navigation.navigate('Details', { itemId: 1, title: 'My item' });
```

**`src/navigation/linking.ts`** maps deep-link URLs to screens so users can open the app directly from a link, e.g.:

```
calculatorapp://calculate?expr=sin(pi/6)
```

---

### 5.3 Calculator Engine

**`src/engine/calc-engine.ts`** — Pure TypeScript, no side-effects. Processes expressions through three stages:

```
"sin(pi/6) + sqrt(3)/2"
        │
        ▼  tokenize()
   Token[]        e.g. [FunctionToken("sin"), LParen, Constant("pi"), ...]
        │
        ▼  shuntingYard()    ← Dijkstra's algorithm: handles precedence & associativity
   RPNItem[]      (Reverse Polish Notation)
        │
        ▼  buildAST()
   ASTNode        (Abstract Syntax Tree — reusable, inspectable)
        │
        ▼  evaluateAST()
   Decimal("1")   ← arbitrary-precision result via decimal.js
```

**Supported operators:** `+`, `-`, `*`, `/`, `^`, `%`, unary `-/+`

**Built-in functions (20+):** `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `sinh`, `cosh`, `tanh`, `sqrt`, `cbrt`, `exp`, `pow`, `ln`, `log`, `log2`, `log10`, `abs`, `ceil`, `floor`, `round`, `sign`, `max`, `min`

**Constants:** `pi`, `e`, `tau`, `phi`

**Quick usage example:**

```ts
import { evaluate } from '@/engine/calc-engine';

const result = evaluate('sqrt(2)^2', { angleMode: 'rad', precision: 12 });
// → Decimal("2")   — exact, no float rounding error
```

The engine is **decoupled from the UI** — it works identically in tests, the calculator screen, and the graph plotter.

---

### 5.4 Calculator UI — CalculatorHome

**`src/components/CalculatorHome.tsx`** contains the full calculator. It is rendered inside `HomeScreen.tsx` (which wraps it in an `ErrorBoundary`).

#### State machine (`useReducer`)

```ts
interface CalcState {
  lhs: string; // Left-hand accumulator passed to the engine, e.g. "12+"
  current: string; // Number the user is currently typing
  parenDepth: number; // Open parentheses count; > 0 means inside sub-expression
  evaluated: boolean; // True after "=" pressed — next digit starts fresh
  error: boolean; // True when last evaluation threw
}
```

Every key press dispatches a `CalcAction` to the reducer. The reducer handles:

- Digit/decimal input
- Operator switching (pressing `+` then `-` replaces the operator)
- Parentheses depth tracking
- `C` pressed once → clears current entry; twice → full reset
- `=` → evaluates the full expression via the engine
- `LOAD_VALUE` → loads a number coming from HistoryScreen's "Use Result" button

#### Performance optimisations

To avoid re-rendering all 20 keys on every digit press:

| Technique                    | Where                                 | What it prevents                                                                               |
| ---------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `React.memo`                 | `CalculatorKeypad`, `CalcKey`         | Skips entire keypad subtree re-render when only the display changes                            |
| `useCallback`                | `handleKey`, `openHistory`            | Keeps the `onKey` prop reference stable so `React.memo` on `CalculatorKeypad` always bails out |
| `useMemo`                    | `styles`, `exprText`, `displayNumber` | Avoids creating a new StyleSheet or re-computing display strings on every render               |
| `useRef` + `useLayoutEffect` | `stateRef`                            | Lets `handleKey` read current state without needing it in its dependency array                 |

#### Data flow for a key press

```
User taps "5"
  → handleKey("5")         [useCallback — stable ref]
  → dispatch({ type: 'DIGIT', digit: '5' })
  → calcReducer runs → new CalcState
  → React re-renders display area ONLY
    (CalculatorKeypad bails out via React.memo)

User taps "="
  → handleKey("=")
  → reads stateRef.current (no closure staleness)
  → calls evaluate(fullExpr)   [calc-engine]
  → historyAdd(expr, result)   [useHistory]
  → dispatch({ type: 'EQUALS' })
  → HapticService.mediumImpact()
```

---

### 5.5 History Subsystem

Three files in `src/history/`:

**`HistoryManager.ts`** — Singleton class. Holds an in-memory `HistoryEntry[]` cache and serialises all writes via a `_writeLock` promise chain (prevents race conditions when multiple saves happen quickly). Reads and writes to AsyncStorage under key `@calculator/history_entries`.

```ts
// Public API
HistoryManager.add(entry); // persist new entry
HistoryManager.getPage({ page, pageSize }); // paginated read (newest-first)
HistoryManager.update(id, changes); // edit existing entry
HistoryManager.remove(id); // delete entry
HistoryManager.clear(); // delete all
```

**`useHistory.ts`** — React hook wrapping `HistoryManager`. Manages `entries`, `isLoading`, `hasMore`, `total` in local state. Supports optimistic updates (UI reflects changes immediately before the async write completes).

**`HistoryScreen.tsx`** usage:

```
Tab gains focus → useFocusEffect → refresh()
  → HistoryManager.getPage(page: 0)
  → FlatList renders entries

Tap row → inline action bar appears
  ├── Edit     → Modal with TextInput → re-evaluate → useHistory.update()
  ├── Use Result → navigate('Home', { loadValue: result })
  └── Delete   → useHistory.remove(id) → optimistic removal from list
```

Each history row displays:

- The expression (e.g. `3 + 4`)
- The result (e.g. `7`)
- A relative timestamp (`Just now`, `5m ago`, `2h ago`, `Mar 1`)

---

### 5.6 Graph Screen

**`src/screens/GraphScreen.tsx`** has two tabs:

#### History Chart tab

- Loads up to 20 most recent results from `useHistory({ pageSize: 20 })`
- Plots them as a cubic-bezier `LineChart` (via `react-native-charts-wrapper` → MPAndroidChart)
- X-axis shows truncated expression labels; Y-axis shows numeric results
- Refreshes on every tab focus via `useFocusEffect`

#### Function Plotter tab

- Accepts any expression using `x` as the variable (e.g. `cos(x) * x`, `x^2 - 3`)
- Evaluates 200 equally-spaced x values from −10 to 10 using the calc-engine
- Discontinuities and ±∞ values are silently skipped
- Auto-plots `sin(x)` on first mount; respects `angleMode` and `precision` from `calculatorStore`

#### Export

- Captures the chart as a PNG via `react-native-view-shot` → `captureRef()`
- Opens the native share sheet (`Share.share`) to save or send

---

### 5.7 Settings Screen

**`src/screens/SettingsScreen.tsx`** has four sections:

| Section           | Control       | Store                                                       |
| ----------------- | ------------- | ----------------------------------------------------------- |
| Dark Mode         | Switch        | `toggleTheme()` in `ThemeProvider`                          |
| Vibration         | Switch        | `hapticEnabled` in `settingsStore`                          |
| Sound             | Switch        | `soundEnabled` in `settingsStore`                           |
| Save History      | Switch        | `saveHistory` in `settingsStore`                            |
| Clear All History | Danger button | calls `useHistory.clear()` after `Alert.alert` confirmation |

All `settingsStore` values are persisted to AsyncStorage automatically via the Zustand `persist` middleware.

---

### 5.8 Theme System

**`src/theme/`** provides a full design system:

| File            | Role                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| `colors.ts`     | Primitive hex palette (blues, greens, reds, neutrals)                               |
| `spacing.ts`    | 4-pt scale: `spacing[1]` = 4px … `spacing[16]` = 64px. Also `radii` (sm/md/lg/full) |
| `typography.ts` | `sizes` (xs → 5xl), `weights`, `lineHeights`, `letterSpacing`                       |
| `index.tsx`     | `lightTheme`, `darkTheme`, `ThemeProvider`, `useTheme()`                            |

**How to use theme in any screen:**

```tsx
import { useTheme, type Theme } from '@/theme';

function MyScreen() {
  const { theme, colorScheme, toggleTheme } = useTheme();
  const s = makeStyles(theme);
  return <View style={s.container} />;
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: { backgroundColor: theme.colors.background.primary },
  });
}
```

`ThemeProvider` reads the device's `useColorScheme()` on mount and exposes `toggleTheme()` to manually override it.

---

### 5.9 Global State — Zustand Stores

**`src/store/calculatorStore.ts`** — in-memory only:

```ts
{
  expression: string; // current expression string for the plotter
  result: string; // last result
  angleMode: 'rad' | 'deg';
  precision: number; // decimal.js significant digits (default 12)
}
```

**`src/store/settingsStore.ts`** — persisted to AsyncStorage:

```ts
{
  isDark: boolean;
  hapticEnabled: boolean;
  soundEnabled: boolean;
  saveHistory: boolean;
}
```

On cold start rehydration, `onRehydrateStorage` syncs `HapticService.enabled` and `SoundService.enabled` to match the persisted values.

---

### 5.10 Services

| File                | What it does                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NetworkService.ts` | Wraps `@react-native-community/netinfo`. Exposes `isOnline: boolean` and a subscriber pattern so any component can react to connectivity changes without polling. |
| `SyncQueue.ts`      | Offline-first operation queue. Operations are saved to AsyncStorage and `replay()`-ed when connectivity is restored.                                              |
| `SentryService.ts`  | Thin wrapper around `@sentry/react-native`. Exports `initSentry()`, `captureException()`, and `addBreadcrumb()`. DSN is read from the `SENTRY_DSN` env var.       |
| `HapticService.ts`  | Wraps `react-native-haptic-feedback`. Respects the `hapticEnabled` flag from `settingsStore`.                                                                     |
| `SoundService.ts`   | Sound-effect stub, ready to wire up `react-native-sound`.                                                                                                         |

---

### 5.11 Error Boundaries

`ErrorBoundary` (`src/components/ErrorBoundary.tsx`) is a React class component using `componentDidCatch`. It renders a fallback UI with a "Try Again" button that resets `hasError` and remounts the children.

There are four boundaries in the app:

| Location            | Protects               |
| ------------------- | ---------------------- |
| `App.tsx`           | Entire navigation tree |
| `HomeScreen.tsx`    | Calculator UI          |
| `HistoryScreen.tsx` | History list           |
| `GraphScreen.tsx`   | Chart area             |

---

## 6. Testing

```bash
npm test                   # Run all tests
npm test -- --coverage     # Run with coverage report
npm test -- --watch        # Watch mode
```

The test suite has **489 tests across 18 suites**:

| Area       | Files                                                                            |
| ---------- | -------------------------------------------------------------------------------- |
| Engine     | `calc-engine.test.ts`                                                            |
| History    | `HistoryManager.test.ts`, `useHistory.test.ts`                                   |
| Components | `CalculatorHome.test.tsx`, `CalculatorKeypad.test.tsx`, `ErrorBoundary.test.tsx` |
| Screens    | `HomeScreen`, `HistoryScreen`, `GraphScreen`, `SettingsScreen`, `DetailsScreen`  |
| Stores     | `calculatorStore.test.ts`, `settingsStore.test.ts`                               |
| Services   | `HapticService`, `SoundService`, `SyncQueue`                                     |
| Utils      | `deepLinkParser.test.ts`                                                         |

Native modules (charts, haptics, AsyncStorage, NetInfo, Sentry) are mocked in `__mocks__/`.

---

## 7. Onboarding Checklist for Teammates

- [ ] Install Node 18+, JDK 17 (Temurin), Android Studio
- [ ] Clone repo → `npm install`
- [ ] Create at least one AVD in Android Studio Device Manager
- [ ] Run `. .\dev-env.ps1` in your PowerShell terminal
- [ ] Run `npm run android` to build and install
- [ ] Run `npm run ci` before every push — it must pass

---

## 8. Troubleshooting

| Problem                             | Fix                                            |
| ----------------------------------- | ---------------------------------------------- |
| `java -version` shows wrong version | Re-run `. .\dev-env.ps1` in the same terminal  |
| Metro stuck or stale hot-reload     | `npm run start:clean`                          |
| No device/emulator detected         | Start an AVD in Android Studio Device Manager  |
| Gradle build fails                  | `npm run clean:android` then `npm run android` |
| `ENOSPC` or file watcher error      | Increase system inotify limit (Linux/macOS)    |
| Commit blocked                      | Run `npm run ci` and fix any errors reported   |

---

## 9. Publishing to GitHub

```bash
# Stage all changes
git add .

# Commit
git commit -m "feat: initial release"

# Set main branch and add remote (first time only)
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git

# Push
git push -u origin main
```

If you haven't set your Git identity yet:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

---

## 10. Security Notes

These files are intentionally **excluded from Git** (see `.gitignore`):

- `.env`, `.env.*` — environment variables
- `android/keystore.properties` — release signing passwords
- `android/app/*.keystore`, `*.jks` — signing keystores

Use `keystore.properties.example` as the template when onboarding a new machine.
Never commit private keys or secrets to the repository.
