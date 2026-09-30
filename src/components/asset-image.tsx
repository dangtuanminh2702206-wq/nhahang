"use client";

import Image from "next/image";
import { useState } from "react";
import { MediaPlaceholder } from "@/components/media-placeholder";
import type { MediaKind, ResolvedMedia } from "@/data/media";

type AssetImageProps = {
  asset: ResolvedMedia;
  label: string;
  kind?: MediaKind;
  className?: string;
  sizes: string;
  preload?: boolean;
  eager?: boolean;
};

export function AssetImage({ asset, label, kind = "space", className = "", sizes, preload = false, eager = false }: AssetImageProps) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const isAvailable = asset.status === "available" && failedPath !== asset.path;

  return (
    <div
      className={`media-frame media-frame-${kind} ${className}`}
      style={{ aspectRatio: asset.aspectRatio }}
      data-asset-path={asset.path}
      data-asset-status={isAvailable ? "available" : failedPath === asset.path ? "error" : "pending"}
    >
      {isAvailable ? (
        <Image
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${asset.path}`}
          alt={asset.alt}
          fill
          sizes={sizes}
          preload={preload}
          loading={preload ? undefined : eager ? "eager" : "lazy"}
          style={{ objectFit: "cover", objectPosition: asset.objectPosition }}
          onError={() => setFailedPath(asset.path)}
        />
      ) : (
        <MediaPlaceholder label={label} kind={kind} className="asset-fallback" />
      )}
    </div>
  );
}
