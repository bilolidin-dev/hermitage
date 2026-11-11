import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/lib/i18n/config";

/**
 * Unknown language prefixes with deeper paths (e.g. /xx/projects) would
 * otherwise fall through to Next's unstyled default 404, because the public
 * root layout lives under [locale]. Rewriting them to the single-segment path
 * lets the app's own three-language 404 (global-not-found) handle them.
 * Known locales, /admin, assets and Next internals are not touched.
 */
export function proxy(request: NextRequest) {
  const first = request.nextUrl.pathname.split("/")[1] ?? "";
  if (isLocale(first)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/${first}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Only paths with two or more segments, excluding admin, demo images and internals.
  matcher: ["/((?!_next/|admin|demo/|brand/|icon\\.svg|favicon\\.ico)[^/]+/.+)"],
};
