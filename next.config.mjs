/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // GitHub Pagesのサブディレクトリ用（リポジトリ名に合わせて変更）
  // basePath: '/inclusive-edu-navi',
  // assetPrefix: '/inclusive-edu-navi/',
};

export default nextConfig;
