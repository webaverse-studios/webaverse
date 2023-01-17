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
      '@webaverse-studios/engine' : resolve(__dirname, './../../libs/engine'),
      "metaversefile": resolve(__dirname, './../../libs/metaversefile/metaversefile.js'),
      "wsrtc": resolve(__dirname, './../../libs/wsrtc'),
      "offscreen-canvas": resolve(__dirname, './../../libs/offscreen-canvas'),
      "zjs": resolve(__dirname, './../../libs/zjs'),
      "previewer": resolve(__dirname, './../../libs/previewer'),
      "multiplayer": resolve(__dirname, './../../apps/multiplayer'),
    },
  },
  // setup relative aliases from @webaverse-studios/engine to ../../libs/engine
  

  

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