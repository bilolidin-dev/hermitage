import { ProjectEditor } from "@/components/admin/project-editor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectEditor key={id} id={decodeURIComponent(id)} />;
}
