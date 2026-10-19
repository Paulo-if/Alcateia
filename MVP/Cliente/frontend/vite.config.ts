import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/cliente/',
  server: {
    port: 4173,
    strictPort: true,
    host: '0.0.0.0',
    hmr: { host: 'localhost', port: 4173 },
  },
});
