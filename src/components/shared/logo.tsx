"use client";

import { useMediaUrl } from "@/hooks/use-data";
import { isValidMediaRef } from "@/lib/domain/media";
import { cn } from "@/lib/utils";

/**
 * Brand mark. No logo file was supplied with the brief, so the default is a
 * typographic wordmark. An uploaded logo (Settings → Logo) replaces it.
 * To ship the original logo, place it in /public/brand and set it as the
 * default `logo` in src/lib/seed/settings.ts.
 */
export function Logo({
  name = "Hermitage Interior Design",
  logo,
  className,
  size = "md",
}: {
  name?: string;
  logo?: string | null;
  className?: string;
  size?: "md" | "lg";
}) {
  const { url } = useMediaUrl(isValidMediaRef(logo) ? logo : null);

  if (isValidMediaRef(logo) && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={cn("w-auto object-contain", size === "lg" ? "h-14" : "h-9", className)}
      />
    );
  }

  const [first = name, ...rest] = name.trim().split(/\s+/);
  return (
    <span className={cn("inline-flex flex-col leading-none", className)} aria-label={name}>
      <span
        aria-hidden
        className={cn(
          "font-serif font-normal uppercase",
          size === "lg" ? "text-[2rem] tracking-[0.3em]" : "text-[1.3rem] tracking-[0.3em]",
        )}
      >
        {first}
      </span>
      {rest.length > 0 && (
        <span
          aria-hidden
          className={cn(
            "mt-1.5 font-sans font-medium uppercase opacity-70",
            size === "lg" ? "text-[0.68rem] tracking-[0.5em]" : "text-[0.5rem] tracking-[0.52em]",
          )}
        >
          {rest.join(" ")}
        </span>
      )}
    </span>
  );
}
