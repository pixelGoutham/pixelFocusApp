import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Separate Vite config for Electron builds.
// Does NOT require PORT or BASE_PATH env vars.
// Sets base: "./" so assets load correctly from file:// protocol.
// Sets VITE_ELECTRON so the app switches to hash-based routing.
// Plugin: strip crossorigin attributes Vite adds to script/link tags.
// These break file:// loading in Electron (CORS doesn't apply to local files
// but Electron still rejects crossorigin requests on file:// protocol).
const stripCrossorigin = {
  name: "strip-crossorigin",
  transformIndexHtml(html: string) {
    return html.replace(/ crossorigin(?:="[^"]*")?/g, "");
  },
};

export default defineConfig({
  base: "./",
  define: {
    "import.meta.env.VITE_ELECTRON": JSON.stringify("true"),
  },
  plugins: [react(), tailwindcss(), stripCrossorigin],
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
