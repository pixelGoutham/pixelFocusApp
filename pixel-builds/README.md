# Pixel — Multi-Platform Build Package

This package contains everything needed to run Pixel on Windows, Fedora (Linux), and Android.

## Windows — `windows/Pixel-1.0.0-win.zip`

Ready to run, no installation required.

1. Extract `Pixel-1.0.0-win.zip` anywhere on your PC.
2. Open the extracted folder and double-click `Pixel.exe`.

That's it — Pixel launches as a desktop app. All your data is stored locally on your machine (in your Windows user AppData folder), fully offline.

> Note: this is a portable build (zip), not an installer wizard. Building a signed NSIS installer (`Setup.exe`) requires Wine and isn't available in this build environment — if you want an installer instead of a portable folder, see `desktop-source/` below and run `npm run build:win` on an actual Windows machine, or in any environment with Wine installed.

## Fedora / Linux — `linux/Pixel-1.0.0.AppImage`

1. Make the file executable: `chmod +x Pixel-1.0.0.AppImage`
2. Run it: `./Pixel-1.0.0.AppImage`

No installation, no root needed. Works on Fedora and most modern Linux distros.

## Android — `android/pixel-android/`

This is a full, ready-to-build Android project (using Capacitor), but the actual `.apk` compilation requires the Android SDK and Gradle, which are not available in this build environment (multi-gigabyte download and an interactive license step). You have two options:

### Option A — Android Studio (easiest)

1. Install [Android Studio](https://developer.android.com/studio).
2. Open the `pixel-android/android` folder as a project.
3. Let Gradle sync (Android Studio downloads the SDK automatically the first time).
4. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
5. Your APK will be in `android/app/build/outputs/apk/debug/app-debug.apk`.

### Option B — Command line (if you already have Android SDK + Java installed)

```
cd pixel-android/android
./gradlew assembleDebug
```

The APK will be at `app/build/outputs/apk/debug/app-debug.apk`. Install it on your phone with:

```
adb install app/build/outputs/apk/debug/app-debug.apk
```

(You'll need to enable "Install from unknown sources" on your Android device if not installing via `adb`.)

## Desktop source — `desktop-source/pixel-desktop/`

The full Electron project source, in case you want to rebuild for macOS, produce a signed Windows installer, or customize the app icon/name. To rebuild:

```
cd pixel-desktop
npm install
npm run build:win     # Windows (zip or installer, needs Wine on Linux/macOS)
npm run build:mac     # macOS .dmg (must run on a Mac)
npm run build:linux   # Linux .AppImage
```

The pre-built web app is already inside `electron-web/` — no need to rebuild the frontend unless you're changing the app itself.

## Data & offline behavior (all platforms)

Pixel stores all your data locally (tasks, study sessions, flashcards, mock tests, settings) using IndexedDB inside the app's own storage — nothing is sent to a server, and no login is required, on any platform. Use the in-app Settings page to export/import a JSON backup file if you want to move your data between devices or platforms.
