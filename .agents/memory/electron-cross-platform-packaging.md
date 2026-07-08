---
name: Electron cross-platform packaging
description: How to build Windows/Linux desktop binaries for the Pixel app from this Linux sandbox, and what's not achievable here (Wine, Android SDK).
---

## What works natively (no extra toolchain)
- **Linux AppImage** — `electron-builder --linux AppImage` builds and runs fine on this sandbox's Linux host.
- **Windows portable zip** — `electron-builder --win` with `win.target: "zip"` and `win.signAndEditExecutable: false` produces a working `Pixel.exe` inside a zip, with no Wine dependency.

## What requires Wine (not installable via `nix-shell -p wine64` here — undefined variable)
- NSIS installer (`target: "nsis"`) and the `portable` target both shell out to a Windows-native `makensis`/resource-editor binary, which needs Wine on a Linux host. Any Windows target other than plain `zip` will fail with `wine is required`.
- **Why:** electron-builder's Windows codesign/resource-editing step runs a `.exe` under the hood even without an actual code-signing cert.
- **How to apply:** default to `win.target: "zip"` + `signAndEditExecutable: false` for Windows builds from this sandbox. Only produce an NSIS installer if built on an actual Windows machine or an environment with Wine.

## Stale Electron download cache corruption
- `~/.cache/electron` (relative to whichever cwd `electron-builder` runs from — check `<repoRoot>/.cache/electron` too) can contain a truncated/corrupted platform zip from an earlier interrupted build, causing a confusing `ENOENT: rename electron.exe -> AppName.exe` error that looks unrelated to caching.
- **How to apply:** if that rename error appears, delete the cached `electron-v*-<platform>-x64.zip` for the target platform and rebuild — don't assume it's a real packaging bug first.

## Android APK
- Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) scaffolds a full Gradle-based Android project fine via plain `npm install` + `npx cap init` + `npx cap add android` — this part needs no SDK.
- Actually compiling the APK (`./gradlew assembleDebug`) needs Java + the Android SDK/build-tools, which are not present and are impractical to install here (multi-GB download, interactive license acceptance). Ship the scaffolded project and instruct the user to open it in Android Studio (auto-installs SDK) or run Gradle themselves with SDK already set up.

## Local-only node_modules for non-workspace folders
- `focusforge-desktop` (Electron project) is not a pnpm workspace member, but electron-builder's own deps had been installed via pnpm at some point, symlinking into the root `.pnpm` store. Any accidental pnpm operation from another ad-hoc folder that prunes the root store silently breaks it (`Cannot find module .../electron-builder/cli.js`).
- **How to apply:** for any ad-hoc, non-workspace project folder (Electron app, Capacitor app, etc.), run `npm install` inside it to get a fully self-contained `node_modules`, independent of the root pnpm store. Never let it rely on pnpm hoisting.

## Workspace hygiene
- Do not run `pnpm install` from inside an ad-hoc folder that isn't declared in `pnpm-workspace.yaml` packages — pnpm will still treat the repo root as the workspace root and can mutate the root `pnpm-lock.yaml` (e.g. pruning unrelated importer entries). Use plain `npm install` inside a standalone folder that lives outside the pnpm workspace glob instead.
