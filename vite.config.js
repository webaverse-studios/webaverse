import {defineConfig} from 'vite'
import {resolve} from 'path';
import pluginSwc from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig(({command, mode, ssrBuild}) => {
  return {
    plugins: [
      pluginSwc(),
    ],
    build: {
      minify: process.env.NODE_ENV === 'production',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          preview: resolve(__dirname, 'preview.html'),
        },
      },
    },
    worker:{
      format: 'es',
    },
    /* optimizeDeps: {
      entries: [
        'src/*.js',
        'src/*.jsx',
        'avatars/*.js',
        'avatars/vrarmik/*.js',
        'src/components/*.js',
        'src/components/*.jsx',
        'src/tabs/*.jsx',
        '*.js'
      ],
    }, */
    server: {
      fs: {
        strict: true,
      },
    },
  };
});