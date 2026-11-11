"use client";

import Link from "next/link";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}

type Tone = "dark" | "light";

const buttonBase =
  "inline-flex min-h-12 items-center justify-center gap-3 px-7 text-[0.84rem] font-semibold tracking-[0.02em] transition-colors duration-300";

export function buttonClass(variant: "solid" | "outline", tone: Tone = "dark") {
  if (variant === "solid") {
    return cn(
      buttonBase,
      tone === "dark" ? "bg-espresso text-ivory hover:bg-charcoal/85" : "bg-ivory text-espresso hover:bg-stone",
    );
  }
  return cn(
    buttonBase,
    "border",
    tone === "dark"
      ? "border-espresso/30 text-espresso hover:border-espresso"
      : "border-ivory/35 text-ivory hover:border-ivory",
  );
}

/** Text link with a drafting-line underline that draws on hover. */
export function LineLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  external?: boolean;
}) {
  const inner = (
    <>
      <span>{children}</span>
      <span
        aria-hidden
        className="absolute inset-x-0 -bottom-1 h-px bg-current opacity-30"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-champagne transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
      />
    </>
  );
  const cls = cn("group relative inline-flex items-center gap-2 text-sm font-semibold", className);
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

/** Large page heading used by inner pages. */
export function PageIntro({ title, lead, aside }: { title: string; lead?: string; aside?: React.ReactNode }) {
  return (
    <Container className="pt-32 sm:pt-40 lg:pt-48">
      <div className="grid gap-8 border-b border-espresso/12 pb-12 lg:grid-cols-12 lg:pb-16">
        <h1 className="font-display text-[clamp(3.4rem,11vw,10rem)] leading-[0.86] lg:col-span-7">{title}</h1>
        <div className="flex flex-col justify-end gap-6 lg:col-span-4 lg:col-start-9">
          {lead && <p className="max-w-[46ch] text-[0.98rem] leading-relaxed text-espresso/70">{lead}</p>}
          {aside}
        </div>
      </div>
    </Container>
  );
}

export function DemoNote({ children, tone = "dark" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <p
      className={cn(
        "flex max-w-2xl items-start gap-3 text-xs leading-relaxed",
        tone === "dark" ? "text-muted" : "text-ivory/55",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 shrink-0 border px-1.5 py-px text-[0.62rem] font-semibold tracking-[0.12em]",
          tone === "dark" ? "border-espresso/25" : "border-ivory/30",
        )}
      >
        DEMO
      </span>
      <span>{children}</span>
    </p>
  );
}

/**
 * Applies SEO text edited in the admin panel on the client. Next.js manages
 * <title> too, so the value is re-applied whenever the head changes.
 */
export function DocumentMeta({ title, description }: { title?: string; description?: string }) {
  useEffect(() => {
    const apply = () => {
      if (title && document.title !== title) document.title = title;
      if (description) {
        let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (!tag) {
          tag = document.createElement("meta");
          tag.name = "description";
          document.head.appendChild(tag);
        }
        if (tag.content !== description) tag.content = description;
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  }, [title, description]);
  return null;
}
