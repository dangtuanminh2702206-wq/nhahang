import type { NextConfig } from "next";

const isPagesPreview = process.env.GITHUB_PAGES === "true";
const basePath = isPagesPreview ? "/nhahang" : "";

const nextConfig: NextConfig = {
  ...(isPagesPreview
    ? {
        output: "export",
        distDir: ".next-pages",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
