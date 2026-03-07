/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    compress: true,
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'i.ytimg.com' },
            { protocol: 'https', hostname: 'e-cdns-images.dzcdn.net' },
        ],
        minimumCacheTTL: 60,
    },
    experimental: {
        optimizePackageImports: ['lucide-react', 'framer-motion'],
    }
};

module.exports = nextConfig;
