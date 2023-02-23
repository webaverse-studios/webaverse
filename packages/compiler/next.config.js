/** @type {import('next').NextConfig} */

const securityHeaders = [
  {
    key: 'Access-Control-Allow-Origin',
    value: '*',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'unsafe-none',
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

const dirToIgnore = /public/;

const nextConfig = {
  eslint: {
    dirs: ['pages', 'types', 'plugins'],
    ignoreDuringBuilds: true,
  },
  // distDir: "dist",
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};
export default nextConfig;
