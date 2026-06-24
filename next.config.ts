import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack config (default bundler in Next.js 16+)
  turbopack: {
    resolveAlias: {
      // Fix tailwindcss resolve issue when project is inside a subdirectory without a package.json above it
      tailwindcss: path.resolve("./node_modules/tailwindcss"),
    },
  },
  // Prevent pdf-parse from being bundled client-side (it uses Node.js built-ins)
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
