import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function generateSpaRoutePages(): Plugin {
  return {
    name: 'generate-spa-route-pages',
    closeBundle() {
      const routes = [
        'about',
        'programs',
        'elders',
        'upa-bial',
        'directory',
        'committee',
        'fellowship',
        'archive',
        'records',
        'gallery',
        'users',
        'dashboard'
      ];
      const distDir = path.resolve(__dirname, 'dist');
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;
      const indexContent = fs.readFileSync(indexPath, 'utf-8');

      // Copy index.html to 404.html in dist for fallback routing
      fs.writeFileSync(path.join(distDir, '404.html'), indexContent);

      // Generate physical folder/index.html for every route to ensure direct HTTP 200 responses
      routes.forEach(route => {
        const routeDir = path.join(distDir, route);
        if (!fs.existsSync(routeDir)) {
          fs.mkdirSync(routeDir, { recursive: true });
        }
        fs.writeFileSync(path.join(routeDir, 'index.html'), indexContent);
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), generateSpaRoutePages()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
