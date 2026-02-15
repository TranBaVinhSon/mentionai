import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mentionai-static-assets.s3.ap-northeast-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "gengar-local.s3.ap-northeast-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "mentionai.s3.ap-northeast-1.amazonaws.com",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@smithy/util-base64": "@smithy/util-base64/dist-cjs/index.js",
      "@smithy/util-stream": "@smithy/util-stream/dist-cjs/index.js",
    };
    
    // Optimize bundle splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    
    return config;
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'hugeicons-react'],
  },
};

export default withBundleAnalyzer(nextConfig);
