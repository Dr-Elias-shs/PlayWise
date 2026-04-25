const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep these heavy native/ESM modules out of the webpack bundle
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth', 'officeparser', 'file-type'],
  },
};

module.exports = withPWA(nextConfig);