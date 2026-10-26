import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt",
    "localhost:3000",
    "127.0.0.1:3000",
    "192.168.1.2:3000",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*.trycloudflare.com",
        "*.loca.lt",
        "localhost:3000",
        "127.0.0.1:3000",
      ],
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
