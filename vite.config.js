import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The web character configurator. The reactive desktop companion lives in
// apps/desktop (its own Vite build) and the standalone runtime in
// packages/character-core.
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})
