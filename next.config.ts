import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // An unrelated lockfile in the home directory makes Next infer the wrong
  // workspace root. Pin it to this project.
  outputFileTracingRoot: here,
  typescript: {
    // Never ship with type errors. The build must fail loudly instead.
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
