import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/SMPL-app/smplDB": {
        target: "http://localhost",
        changeOrigin: true,
      },
    },
  },
})
