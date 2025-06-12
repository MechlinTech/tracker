import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Determine the host based on the environment
  const isDev = mode === 'development';
  const host = isDev ? 'trackerdev.mechlintech.com' : 'tracker.mechlintech.com';
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    // Expose env variables to your client-side code
    define: {
      'process.env': env
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
        overlay: false,
        clientPort: 443,
        host: host
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
  };
});

 