import { Suspense } from "react";
import { ProjectsList } from "@/components/admin/projects-list";

export default function Page() {
  return (
    <Suspense>
      <ProjectsList />
    </Suspense>
  );
}
