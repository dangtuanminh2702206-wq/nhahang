import { statSync } from "node:fs";
import path from "node:path";
import type { MediaAsset, ResolvedMedia } from "@/data/media";

// Resolve only on the server/build. Pending paths never reach next/image.
export function resolveMedia(asset: MediaAsset): ResolvedMedia {
  let exists = false;
  try {
    exists = statSync(path.join(process.cwd(), "public", asset.path)).isFile();
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  return { ...asset, status: exists ? "available" : "pending" };
}
