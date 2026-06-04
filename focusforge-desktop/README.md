# FocusForge Desktop Build

Turn FocusForge into a standalone Windows `.exe` installer.

## Prerequisites (one-time setup)

1. **Node.js 18+** — download from https://nodejs.org
2. **pnpm** — run: `npm install -g pnpm`

## Build steps

```bash
# 1. From the project root, install all workspace dependencies
pnpm install

# 2. Go into this folder
cd focusforge-desktop

# 3. Install Electron + electron-builder
npm install

# 4. Build the web app + package into a Windows installer
npm run dist
```

That's it. The output will be in `focusforge-desktop/release/`:

| File | What it is |
|---|---|
| `FocusForge Setup 1.0.0.exe` | Windows installer (recommended) |
| `FocusForge 1.0.0.exe` | Portable — runs directly, no install needed |

## Icon (optional)

Create a folder `focusforge-desktop/icons/` and place:
- `icon.ico` — Windows icon (256×256 recommended)
- `icon.icns` — macOS icon
- `icon.png` — Linux icon (512×512)

Free tool to convert a PNG to ICO: https://convertico.com

Without icons the build still works, just uses the default Electron icon.

## Other platforms

```bash
npm run build:mac    # macOS .dmg
npm run build:linux  # Linux .AppImage
```

## How it works

1. `npm run dist` first runs `vite build` with `vite.electron.config.ts` — this sets
   `base: "./"` so all assets load from relative paths (needed for `file://` protocol).
2. Then `electron-builder` bundles Electron + the built web files into a self-contained installer.
3. Data is stored in IndexedDB (localforage) inside the user's app data folder — fully offline.
