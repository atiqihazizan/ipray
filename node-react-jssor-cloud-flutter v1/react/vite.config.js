import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: 'VITE_', // .env: VITE_API_BASE, VITE_SOCKET_URL (optional override)
  build: {
    outDir: '../nodejs/public',
    emptyOutDir: true, // Clear folder sebelum build
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-socket': ['socket.io-client'],
          'vendor-hls': ['hls.js'],
        },
      },
    },
  },
  server: {
    port: 5173, // Vite dev server port
    host: true, // Listen on all addresses
    proxy: {
      // Proxy API requests ke Node.js server di port 3001
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Socket.IO ke Node.js server di port 3001
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true, // WebSocket support untuk Socket.IO
        changeOrigin: true,
        secure: false,
      },
      // Proxy images ke API server di port 3001
      '/images': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
