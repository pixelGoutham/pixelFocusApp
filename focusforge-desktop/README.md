# Pixel Desktop Build

Build Pixel into a standalone Windows `.exe` installer.

## Prerequisites (one-time setup)

**Node.js 18+** — download from https://nodejs.org

## Build steps (Windows)

```
# 1. Open PowerShell inside the focusforge-desktop folder, then:

npm install

npm run build:win
```

That's it. The output will be in `focusforge-desktop/release/`:

| File | What it is |
|---|---|
| `Pixel Setup 1.0.0.exe` | Windows installer (recommended) |
| `Pixel 1.0.0.exe` | Portable — runs directly, no install needed |

The built web app is already inside `electron-web/` — no rebuild needed.

## Other platforms

```bash
npm run build:mac    # macOS .dmg
npm run build:linux  # Linux .AppImage
```

## How it works

1. The `electron-web/` folder contains the pre-built Vite app (assets load via `file://` protocol).
2. `electron-builder` bundles Electron + the built web files into a self-contained installer.
3. Data is stored in IndexedDB (localforage) inside the user's app data folder — fully offline.
