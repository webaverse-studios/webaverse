import {defineConfig} from 'vite'
import {swcReactRefresh} from "vite-plugin-swc-react-refresh";
import {resolve} from 'path';

// import metaversefilePlugin from 'metaversefile/plugins/rollup.js'

// https://vitejs.dev/config/
export default defineConfig(({command, mode, ssrBuild}) => {
  return {
    plugins: [
      swcReactRefresh(),
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
      format: 'esm',
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
})