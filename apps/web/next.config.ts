import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lanyard/api-contracts", "@lanyard/ui"],
};

export default nextConfig;
