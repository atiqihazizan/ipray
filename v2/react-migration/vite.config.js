import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'ipray',
    emptyOutDir: true
  },
  server: {
    port: 3000
  },
  resolve: {
    alias: {'@': resolve(__dirname, 'src')}
  },
  publicDir: 'public',
  assetsInclude: ['**/*.ttf', '**/*.woff', '**/*.woff2']
})
