import { ProjectDetailPage } from "@/components/public/pages/project-detail-page";

/** Projects live in the browser data layer, so the page resolves the slug on the client. */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProjectDetailPage slug={decodeURIComponent(slug)} />;
}
