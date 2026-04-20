# MIGRATION & BUILD GUIDE: Homework Hero Expo

This document summarizes the journey of migrating the Homework Hero application from a Vite-based React Web app to a cross-platform Expo (React Native) architecture, focusing on key challenges and technical solutions.

## 1. Architectural Changes

### Responsive Layout
- **Detection**: Used `useWindowDimensions` for real-time screen width tracking.
- **Side-by-Side**: Implemented a desktop-style `Sidebar` for screens $\ge 1024px$ (iPad Pro/Desktop) and a `Bottom Tab Bar` for mobile.
- **Dynamic Views**: All views were ported from HTML elements to React Native primitives (`View`, `Text`, `TouchableOpacity`).

### Monopoly Module Scaling
- **Challenge**: The fixed-size game board was cutting off on smaller devices.
- **Solution**: Implemented a `transform: [{ scale }]` logic based on the shorter dimension of the available screen space, ensuring the game board is always fully visible and centered.

### Data Synchronicity
- **Dexie to Supabase**: Replaced Local IndexedDB with a Supabase-backed adapter that mimics the Dexie API (`toArray`, `put`, `update`).
- **Reactive Queries**: Implemented `liveQuery` using a custom `eventBus` to handle cross-component updates in the absence of the browser's `window.dispatchEvent`.

---

## 2. Technical Hurdles & Fixes

### NativeWind v4 (CSS Interop)
- **Problem**: Build error `Unable to resolve module react-native-css-interop/jsx-runtime`.
- **Cause**: Incompatibility between NativeWind v4 and Tailwind CSS v4.
- **Fix**: 
    1. Downgraded `tailwindcss` to `v3.4.1`.
    2. Explicitly installed `react-native-css-interop@0.2.3` as a direct dependency.
    3. Added `withNativeWind` to `metro.config.js`.

### Runtime Initialization (Android Hangs)
- **Reanimated Plugin**: Missing the Reanimated Babel plugin is the #1 cause of app hangs on Android. It must be the *last* item in `babel.config.js`.
- **Polyfills**: Supabase fails silently if `URL`, `Proxy`, or `Crypto` behave unexpectedly. We imported `react-native-url-polyfill/auto` and `react-native-get-random-values` at the very top of `app/_layout.tsx`.

### Android Build Environment
- **Java Runtime**: If system `java_home` is missing, you can use the Android Studio JBR:
  `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
- **Node Resolution**: Gradle often fails to find `node` if installed via Homebrew. Creating a symlink in `~/.local/bin/node` ensures global visibility.
- **Metaspace Error**: Increased Gradle RAM in `gradle.properties`:
  `org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g`

---

## 3. How to Build (CLI)

### Debug Build (Connects to Metro)
```bash
cd android && ./gradlew assembleDebug
```
*Output: `android/app/build/outputs/apk/debug/app-debug.apk`*

### Release Build (Standalone)
```bash
npx expo export --platform android
cd android && ./gradlew assembleRelease
```
*Output: `android/app/build/outputs/apk/release/app-release.apk`*

---

## 4. Key Lessons
- **Polyfill Early**: Native platforms lack many web globals. Always polyfill in the entry file.
- **Quote Paths**: When setting `JAVA_HOME` for paths with spaces (like "Android Studio.app"), always use quotes.
- **Clean Cache**: When Babel or NativeWind config changes, always run `npx expo start -c`.
