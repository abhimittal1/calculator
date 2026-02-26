# Calculator App

A React Native TypeScript scaffold with navigation, linting, formatting, git hooks, and CI out of the box.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| **React Native 0.73** | Cross-platform mobile framework |
| **TypeScript** | Type safety |
| **React Navigation v6** | Stack-based navigation |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Husky + lint-staged** | Pre-commit / pre-push git hooks |
| **Jest + Testing Library** | Unit testing |
| **GitHub Actions** | CI: lint, type-check, tests |

---

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── ci.yml          # GitHub Actions CI pipeline
├── .husky/
│   ├── pre-commit          # Runs lint-staged on staged files
│   └── pre-push            # Runs type-check + tests before push
├── src/
│   ├── navigation/
│   │   ├── index.tsx       # Root navigator
│   │   └── types.ts        # Navigation param list & screen props
│   └── screens/
│       ├── HomeScreen.tsx
│       ├── DetailsScreen.tsx
│       └── __tests__/
│           ├── HomeScreen.test.tsx
│           └── DetailsScreen.test.tsx
├── __tests__/
│   └── App.test.tsx
├── App.tsx                 # Root component
├── index.js                # Entry point
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── package.json
```

---

## Prerequisites

Ensure your machine is set up for React Native development:

- **Node.js** ≥ 18 — [nodejs.org](https://nodejs.org)
- **Watchman** (macOS/Linux) — `brew install watchman`
- **Android** — Android Studio + Android SDK
- **iOS** (macOS only) — Xcode + CocoaPods (`gem install cocoapods`)

> Follow the official [React Native Environment Setup](https://reactnative.dev/docs/environment-setup) guide for your OS.

---

## Local Development

### 1. Clone & install

```bash
git clone https://github.com/your-org/calculator-app.git
cd calculator-app
npm install
```

### 2. Install iOS pods (macOS only)

```bash
cd ios && pod install && cd ..
```

### 3. Start Metro

```bash
npm start
```

### 4. Run on device / simulator

```bash
# Android
npm run android

# iOS (macOS only)
npm run ios
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the Metro bundler |
| `npm run android` | Run on Android emulator / device |
| `npm run ios` | Run on iOS simulator / device |
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint and auto-fix issues |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run type-check` | Run TypeScript compiler check |

---

## Linting & Formatting

ESLint and Prettier are configured to work together. Prettier is run as an ESLint rule so you get unified error reporting.

```bash
# Check lint errors
npm run lint

# Fix lint errors automatically
npm run lint:fix

# Format all supported files
npm run format
```

---

## Testing

Tests use **Jest** with **@testing-library/react-native**.

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

---

## Git Hooks (Husky)

Hooks are installed automatically after `npm install` via the `prepare` script.

| Hook | Trigger | Action |
|------|---------|--------|
| `pre-commit` | Every commit | Runs **lint-staged** (ESLint + Prettier on staged files) |
| `pre-push` | Every push | Runs **type-check** + **full test suite** |

To skip hooks temporarily (not recommended):

```bash
git commit --no-verify
git push --no-verify
```

---

## CI / GitHub Actions

The pipeline is defined in [.github/workflows/ci.yml](.github/workflows/ci.yml) and runs on every push and pull request to `main` / `develop`.

**Jobs:**

1. **Lint** — ESLint, Prettier format check, TypeScript type-check  
2. **Test** — Jest with coverage; coverage artifact uploaded for 7 days

---

## Adding a New Screen

1. Add the screen name and params to `src/navigation/types.ts`:

```ts
export type RootStackParamList = {
  Home: undefined;
  Details: {itemId: number; title: string};
  NewScreen: {someParam: string}; // ← add here
};
```

2. Create `src/screens/NewScreen.tsx`:

```tsx
import React from 'react';
import {View, Text} from 'react-native';
import {RootStackScreenProps} from '@/navigation/types';

type Props = RootStackScreenProps<'NewScreen'>;

export function NewScreen({route}: Props): React.JSX.Element {
  return (
    <View>
      <Text>{route.params.someParam}</Text>
    </View>
  );
}
```

3. Register the screen in `src/navigation/index.tsx`.

---

## Contributing

1. Fork the repo and create a feature branch from `develop`.
2. Make changes — hooks will lint/format on commit and run tests on push.
3. Open a pull request. CI runs automatically.

---

## License

MIT
