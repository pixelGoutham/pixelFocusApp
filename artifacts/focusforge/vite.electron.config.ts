import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Strip crossorigin attrs and CDN font links from the HTML output.
// Both break Electron's file:// renderer: crossorigin triggers a CORS check
// that file:// can't satisfy, silently preventing the JS + CSS from loading.
function electronHtmlFix(): Plugin {
  return {
    name: "electron-html-fix",
    transformIndexHtml(html: string) {
      return html
        .replace(/ crossorigin(="[^"]*")?/g, "")
        .replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g, "")
        .replace(/<link[^>]*fonts\.gstatic\.com[^>]*>\s*/g, "")
        .replace(/<link[^>]*rel="preconnect"[^>]*>\s*/g, "");
    },
  };
}

export default defineConfig({
  base: "./",
  define: {
    "import.meta.env.VITE_ELECTRON": JSON.stringify("true"),
  },
  plugins: [react(), tailwindcss(), electronHtmlFix()],
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
