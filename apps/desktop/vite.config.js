import react from "@vitejs/plugin-react";
import { defineConfig, searchForWorkspaceRoot } from "vite";

// Renderer build for the Electron desktop pet. `base: "./"` so the built
// index.html loads over file:// inside Electron. @companion/character-core is a
// linked workspace package shipped as source: we exclude it from dep
// pre-bundling so its JSX is transformed by the React plugin, and allow Vite to
// serve files from the monorepo root where it lives.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [searchForWorkspaceRoot(process.cwd())] },
  },
  optimizeDeps: { exclude: ["@companion/character-core"] },
});
