import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

import {resolve} from 'path';

export default defineConfig({
  server: {
    port: 4200,
    host: 'localhost',
  },

  plugins: [
    react(),
  ],
  resolve:{
    alias:{
      '@webaverse-studios/engine' : resolve(__dirname, './../../packages/engine'),
      "metaversefile": resolve(__dirname, './../../packages/metaversefile/metaversefile.js'),
      "wsrtc": resolve(__dirname, './../../packages/wsrtc'),
      "offscreen-canvas": resolve(__dirname, './../../packages/offscreen-canvas'),
      "zjs": resolve(__dirname, './../../packages/zjs'),
      "previewer": resolve(__dirname, './../../packages/previewer'),
      "multiplayer": resolve(__dirname, './../../packages/multiplayer'),
    },
  },
  // setup relative aliases from @webaverse-studios/engine to ../../packages/engine
  

  

  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [
  //    viteTsConfigPaths({
  //      root: '../../',
  //    }),
  //  ],
  // },

  test: {
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
})