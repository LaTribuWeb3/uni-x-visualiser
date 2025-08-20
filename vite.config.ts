import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react(), tailwindcss()],
    build: {
      emptyOutDir: false
    },
    define: {
      'import.meta.env.VITE_MONGODB_URI': JSON.stringify(env.MONGODB_URI),
      'import.meta.env.VITE_DB_NAME': JSON.stringify(env.DB_NAME),
      'import.meta.env.VITE_COLLECTION_NAME': JSON.stringify(env.COLLECTION_NAME),
    },
    optimizeDeps: {
      force: true,
      include: ['react', 'react-dom']
    },
    esbuild: {
      target: 'es2020'
    }
  }
})
