import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ninjas-api': {
        target: 'https://api.api-ninjas.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/ninjas-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('X-Api-Key', 'XRnc3LmPTMSXT2vAYfK5bybf6BwQuxKapulX8ica')
          })
        },
      },
    },
  },
})
