import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "ccxt",
    "technicalindicators",
    "bullmq",
    "ioredis",
    "ws",
    "worker_threads",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ["92.5.63.11:3011", "localhost:3000"],
    },
  },
};

export default nextConfig;
