const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Do not precache pictures: they made every tablet download ~67 MB on install,
  // which stalled first launch on school Wi-Fi. Images are still cached at runtime
  // the first time they are shown.
  publicExcludes: ['!noprecache/**/*', '!character/**/*', '!characters/**/*', '!games/**/*', '!prizes/**/*', '!world/**/*', '!accessories/**/*'],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
};

module.exports = withPWA(nextConfig);