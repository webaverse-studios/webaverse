import {defineConfig} from 'vite'
// import {swcReactRefresh} from "vite-plugin-swc-react-refresh";
import pluginSwc from '@vitejs/plugin-react-swc';
// import metaversefilePlugin from 'metaversefile/plugins/rollup.js'

// https://vitejs.dev/config/
export default defineConfig(({command, mode, ssrBuild}) => {
  return {
    plugins: [
      pluginSwc(),
    ],
    build: {
      minify: process.env.NODE_ENV === 'production',
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