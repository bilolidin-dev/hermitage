import { notFound } from "next/navigation";

// Rendered on demand so the localized 404 is server-rendered inside the
// language layout (the parent layout disallows unknown *locales* only).
export const dynamicParams = true;

/** Any unknown path inside a language renders that language's 404 page. */
export default function CatchAll() {
  notFound();
}
