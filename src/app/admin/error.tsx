"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminI18n } from "@/components/admin/admin-context";
import { Button } from "@/components/admin/ui";
import { resetDemoData } from "@/lib/repositories";

/**
 * Admin error boundary. Besides retrying, it offers a demo-data reset, which
 * recovers from browser data the UI cannot handle.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useAdminI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="max-w-xl py-10" role="alert">
      <h1 className="font-display text-5xl leading-none">{t.errorPage.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">{t.errorPage.text}</p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant="primary" onClick={reset}>
          {t.errorPage.retry}
        </Button>
        <Button
          variant="danger"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await resetDemoData().catch(() => undefined);
            router.replace("/admin");
            reset();
          }}
        >
          {t.errorPage.reset}
        </Button>
      </div>
    </div>
  );
}
