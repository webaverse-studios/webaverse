import {defineConfig} from 'vite'
import pluginReact from '@vitejs/plugin-react'
// import metaversefilePlugin from 'metaversefile/plugins/rollup.js'

// https://vitejs.dev/config/
export default defineConfig(({command, mode, ssrBuild}) => {
  return {
    plugins: [
      pluginReact(),
    ],
    build: {
      minify: process.env.NODE_ENV === 'production',
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
