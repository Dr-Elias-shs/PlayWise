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
  // Character, outfit and accessory pictures (Nov 2026): devices keep them for 7 days
  // instead of asking the server again every time (Render free bandwidth ran out on
  // 5 Nov). A player changing outfit shows a different file, so friends see it at once;
  // only art replaced under the SAME file name can look old for up to a week.
  async headers() {
    const keep = [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }];
    return ['character', 'characters', 'accessories'].map(d => ({ source: `/${d}/:path*`, headers: keep }));
  },
};

module.exports = withPWA(nextConfig);