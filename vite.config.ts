import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
       // Proxy /services to where SolrWayback is running (assuming localhost:8080)
       // This mimics the Vue app's proxy setup
      '/services': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/solrwayback\/services/, '/solrwayback/services'),
      },
      '/solrwayback': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        autoRewrite: true,
        // Rewrite Location headers on 3xx redirects so they go back through the proxy
        // instead of pointing directly at localhost:8080 (which causes CORS errors)
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const location = proxyRes.headers['location'];
            if (location && location.includes('localhost:8080')) {
              proxyRes.headers['location'] = location.replace(
                'http://localhost:8080',
                'http://localhost:5173'
              );
            }
          });
        },
      }
    },
  },
})
