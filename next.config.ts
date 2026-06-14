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
};

export default nextConfig;
