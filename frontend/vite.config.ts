import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3030,
    fs: {
      // Allow importing deployment/ABI JSON from sibling contracts dir
      allow: [path.resolve(__dirname, '..'), path.resolve(__dirname, '../contracts')]
    },
    proxy: {
      '/api': {
        // Allow overriding the backend URL via env for Docker Compose
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
