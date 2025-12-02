import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backend = process.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': backend,
      '/clients': backend,
      '/publications': backend,
      '/media-mentions': backend,
      '/press-releases': backend,
      '/feedback-summaries': backend,
      '/search-jobs': backend,
    },
  },
});
