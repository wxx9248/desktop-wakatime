import path from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";
import tailwindcss from '@tailwindcss/vite';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main.ts",
        vite: {
          build: {
            rollupOptions: {
              external: [
                "node-global-key-listener",
                "icon-promise",
              ],
            },
            minify: false,
          },
        },
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, "electron/preload.ts"),
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      electron: path.resolve(__dirname, "./electron"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        monitored_apps: path.resolve(__dirname, "monitored-apps.html"),
        settings: path.resolve(__dirname, "settings.html"),
      },
    },
  },
});
