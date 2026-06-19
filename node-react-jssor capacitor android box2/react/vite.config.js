import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envPrefix: 'VITE_', // .env: VITE_API_URL, VITE_API_BASE, VITE_SOCKET_URL
  build: {
    outDir: 'dist',
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
      // Proxy images ke API server (laluan relatif /images/... dalam dev)
      '/images': {
        target: 'https://ipray-android.mahsites.net',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
