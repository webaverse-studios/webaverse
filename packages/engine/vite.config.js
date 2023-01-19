import {defineConfig} from 'vite'
// import {swcReactRefresh} from "vite-plugin-swc-react-refresh";
import pluginSwc from '@vitejs/plugin-react-swc';
import {resolve} from 'path'
// import metaversefilePlugin from 'metaversefile/plugins/rollup.js'

// https://vitejs.dev/config/
export default defineConfig(({command, mode, ssrBuild}) => {
  return {
    plugins: [
      pluginSwc(),
    ],
    build: {
      minify: process.env.NODE_ENV === 'production',
      lib: {
        // Could also be a dictionary or array of multiple entry points
        entry: resolve(__dirname, 'index.mjs'),
        name: 'webaverse-engine',
        // the proper extensions will be added
        fileName: 'webaverse-engine',
      },
    },
    worker:{
      format: 'esm',
    },

    server: {
      fs: {
        strict: true,
      },
    },
  };
})