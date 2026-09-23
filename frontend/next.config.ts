import type { NextConfig } from "next";

const onGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  basePath: onGitHubPages ? "/genlayer-prooflens" : "",
  assetPrefix: onGitHubPages ? "/genlayer-prooflens/" : "",
  images: { unoptimized: true },
  reactStrictMode: true,
  turbopack: {},
};

export default nextConfig;
