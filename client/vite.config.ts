import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/architecture/',
  server: {
    proxy: {
      '/explorer-data': 'http://localhost:3000',
    },
  },
});
