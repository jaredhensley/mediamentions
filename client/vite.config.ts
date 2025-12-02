import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/clients': 'http://localhost:3000',
      '/publications': 'http://localhost:3000',
      '/media-mentions': 'http://localhost:3000',
      '/press-releases': 'http://localhost:3000',
      '/api': 'http://localhost:3000'
    }
  }
});
