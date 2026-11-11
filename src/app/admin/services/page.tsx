import { Suspense } from "react";
import { ServicesManager } from "@/components/admin/services-manager";

export default function Page() {
  return (
    <Suspense>
      <ServicesManager />
    </Suspense>
  );
}
