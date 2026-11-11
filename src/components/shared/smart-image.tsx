"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";
import { useMediaUrl } from "@/hooks/use-data";
import { isValidMediaRef } from "@/lib/domain/media";
import type { MediaRef } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

interface SmartImageProps {
  src: MediaRef | null | undefined;
  alt: string;
  /** Responsive sizes hint for static images. */
  sizes?: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /** Text shown when a local image is unavailable in this browser. */
  missingLabel?: string;
  tone?: "light" | "dark";
  fit?: "cover" | "contain";
}

/**
 * Renders any media reference (static demo file, local browser image, or a
 * future cloud URL) filling its positioned parent. Never shows a broken image:
 * missing local files fall back to a quiet placeholder.
 */
export function SmartImage({
  src,
  alt,
  sizes = "100vw",
  priority,
  className,
  imgClassName,
  missingLabel,
  tone = "light",
  fit = "cover",
}: SmartImageProps) {
  // Unknown schemes (e.g. "//host", "javascript:") are never rendered.
  const { url, status } = useMediaUrl(isValidMediaRef(src) ? src : null);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const loaded = !!url && loadedUrl === url;
  const failed = !!url && failedUrl === url;

  const base = cn("absolute inset-0 overflow-hidden", tone === "dark" ? "bg-charcoal" : "bg-stone", className);

  if (status === "loading") return <div className={cn(base, "skeleton")} aria-hidden />;

  if (!url || status === "missing" || failed) {
    return (
      <div
        className={cn(
          base,
          "flex flex-col items-center justify-center gap-2 p-4 text-center",
          tone === "dark" ? "text-muted-inverse" : "text-muted",
        )}
        role="img"
        aria-label={missingLabel ?? alt}
      >
        <ImageOff className="size-5" strokeWidth={1.25} aria-hidden />
        {missingLabel ? <span className="max-w-[24ch] text-xs leading-snug">{missingLabel}</span> : null}
      </div>
    );
  }

  const imgClasses = cn(
    "h-full w-full transition-opacity duration-700 ease-out",
    fit === "cover" ? "object-cover" : "object-contain",
    loaded ? "opacity-100" : "opacity-0",
    imgClassName,
  );

  const isStatic = url.startsWith("/") && !url.startsWith("//");
  return (
    <div className={base}>
      {isStatic ? (
        <Image
          src={url}
          alt={alt}
          fill
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          quality={75}
          className={imgClasses}
          onLoad={() => setLoadedUrl(url)}
          onError={() => setFailedUrl(url)}
        />
      ) : (
        // Local object URLs and external URLs bypass the Next image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          className={cn("absolute inset-0", imgClasses)}
          onLoad={() => setLoadedUrl(url)}
          onError={() => setFailedUrl(url)}
          decoding="async"
        />
      )}
    </div>
  );
}
