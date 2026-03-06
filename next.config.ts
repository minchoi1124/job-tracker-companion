import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jsdom", "@mozilla/readability", "html-encoding-sniffer", "whatwg-encoding"],
};

export default nextConfig;
