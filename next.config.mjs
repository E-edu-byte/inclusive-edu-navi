/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/inclusive',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
