import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    },
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    chunkSizeWarningLimit: 1000,
    sourcemap: false
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
      clientPort: 443,
      // host: 'tracker.mechlintech.com'
    },
    watch: {
      usePolling: true
    },
    allowedHosts: ['tracker.mechlintech.com', 'localhost', '127.0.0.1', 'trackerdev.mechlintech.com','trackerprod.mechlintech.com',]
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@supabase/supabase-js',
      'date-fns'
    ]
  }
});
