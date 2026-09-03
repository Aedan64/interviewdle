import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    const cloudflareRuntime = path.resolve(process.cwd(), "db/runtime.ts");
    const vercelRuntime = path.resolve(process.cwd(), "db/vercel-runtime.ts");
    config.resolve.alias["interviewdle-db-runtime"] = vercelRuntime;
    config.resolve.alias[cloudflareRuntime] = vercelRuntime;
    return config;
  },
};

export default nextConfig;
