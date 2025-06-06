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
    host: true, // Allows access via IP/domain
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'trackerdev.mechlintech.com', // Your dev domain or IP
      protocol: 'ws',                      // Use 'wss' if using HTTPS
      clientPort: 5173,                    // Must match dev port unless proxied
      overlay: true                        // Enable overlay for HMR errors
    },
    watch: {
      usePolling: true
    },
    allowedHosts: [
      'tracker.mechlintech.com',
      'trackerdev.mechlintech.com',
      'trackerprod.mechlintech.com',
      'localhost',
      '127.0.0.1'
    ]
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

 