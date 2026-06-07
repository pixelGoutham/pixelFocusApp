import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Separate Vite config for Electron builds.
// Does NOT require PORT or BASE_PATH env vars.
// Sets base: "./" so assets load correctly from file:// protocol.
// Sets VITE_ELECTRON so the app switches to hash-based routing.
export default defineConfig({
  base: "./",
  define: {
    "import.meta.env.VITE_ELECTRON": JSON.stringify("true"),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/electron-web"),
    emptyOutDir: true,
  },
});
