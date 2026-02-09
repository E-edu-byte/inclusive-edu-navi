/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/inclusive',
  assetPrefix: '/inclusive',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
