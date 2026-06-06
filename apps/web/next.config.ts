import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "oaidalleapiprodscus.blob.core.windows.net" },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@agoralabs-sh/avm-web-provider": false,
      "@walletconnect/modal": false,
      "@walletconnect/sign-client": false,
      "lute-connect": false,
      "@web3auth/modal": false,
      "@web3auth/single-factor-auth": false,
      "@web3auth/base": false,
      "@web3auth/base-provider": false,
    };
    return config;
  },
  turbopack: {
    resolveAlias: {},
  },
};

export default nextConfig;
