import type { NextConfig } from "next";

const isPagesPreview = process.env.GITHUB_PAGES === "true";
const basePath = isPagesPreview ? "/nhahang" : "";

const nextConfig: NextConfig = {
  // Server-only endpoints/proxy are excluded from the static public demo.
  pageExtensions: isPagesPreview ? ["demo.tsx", "tsx", "ts"] : ["server.ts", "tsx", "ts"],
  ...(isPagesPreview
    ? {
        output: "export",
        distDir: ".next-pages",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_STATIC_DEMO: String(isPagesPreview) },
};

export default nextConfig;
