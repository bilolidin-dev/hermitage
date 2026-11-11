"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible modal built on the native <dialog> element: focus is trapped by
 * the browser, Escape is routed through `onClose` so callers can guard it.
 */
export function Modal({
  open,
  onClose,
  children,
  className,
  labelledBy,
  label,
  variant = "center",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
  label?: string;
  variant?: "center" | "drawer" | "fullscreen";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const root = document.documentElement;
      const prev = root.style.overflow;
      root.style.overflow = "hidden";
      return () => {
        root.style.overflow = prev;
        if (dialog.open) dialog.close();
      };
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onCloseRef.current();
      }}
      onMouseDown={(e) => {
        // Click on the backdrop (the dialog box itself, outside its content)
        if (e.target === ref.current) onCloseRef.current();
      }}
      className={cn(
        "dialog-animate bg-transparent p-0 backdrop:bg-espresso/55",
        variant === "center" && "m-auto w-[min(32rem,calc(100vw-2rem))] max-w-none",
        variant === "drawer" &&
          "drawer my-0 ml-auto mr-0 h-dvh max-h-none w-full max-w-none sm:w-[min(44rem,100vw)]",
        variant === "fullscreen" && "m-0 h-dvh max-h-none w-screen max-w-none",
        className,
      )}
    >
      {open ? children : null}
    </dialog>
  );
}
