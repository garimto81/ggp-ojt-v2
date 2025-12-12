import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { versionJsonPlugin } from './vite-plugin-version.js';

// ESM에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), versionJsonPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      // Legacy aliases (backwards compatibility)
      '@utils': path.resolve(__dirname, './src/utils'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Function-based manual chunks for Vite 7
        manualChunks(id) {
          // Vendor chunks from node_modules
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'vendor-react';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs')) {
              return 'vendor-chart';
            }
            if (id.includes('quill')) {
              return 'vendor-quill';
            }
            if (id.includes('pdfjs-dist')) {
              return 'vendor-pdf';
            }
            if (id.includes('@mlc-ai') || id.includes('webllm')) {
              return 'vendor-webllm';
            }
            if (id.includes('dexie')) {
              return 'vendor-dexie';
            }
          }
          // Feature chunks from src
          if (id.includes('/features/admin/')) {
            return 'feature-admin';
          }
          if (id.includes('/features/ai/')) {
            return 'feature-ai';
          }
        },
      },
    },
    // Increase warning limit (WebLLM is large)
    chunkSizeWarningLimit: 1000,
  },
});
