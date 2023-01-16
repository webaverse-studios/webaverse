/** @type {import('next').NextConfig} */

if (
  process.env.LD_LIBRARY_PATH == null ||
  !process.env.LD_LIBRARY_PATH.includes(
    `${process.env.PWD}/node_modules/canvas/build/Release:`,
  )
) {
  process.env.LD_LIBRARY_PATH = `${
    process.env.PWD
  }/node_modules/canvas/build/Release:${process.env.LD_LIBRARY_PATH || ''}`;
}

const securityHeaders = [
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'require-corp',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'cross-origin',
  },
];

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  webpack(config) {
    return Object.assign({}, config, {
      /* externals: Object.assign({}, config.externals, {
        fs: 'fs',
      }), */
      module: Object.assign({}, config.module, {
        rules: config.module.rules.concat([
          /* {
            test: /\.md$/,
            loader: 'emit-file-loader',
            options: {
              name: 'dist/[path][name].[ext]',
            },
          }, */
          {
            test: /\.md$/,
            loader: 'raw-loader',
          }
        ])
      }),
    });
  },
};
export default nextConfig;
// module.exports = nextConfig;