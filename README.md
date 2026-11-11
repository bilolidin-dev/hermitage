# Hermitage Interior Design — frontend prototype

A working prototype of the Hermitage public website and a **demo** content
management panel. Both read and write the same data layer, so changes made in
`/admin` appear on the site as soon as they are saved.

> **Demo only.** There is no login, no server-side data and no cloud storage.
> Content is stored in the visitor's browser (localStorage). Images added from a
> device are stored in the browser's IndexedDB and shown through temporary
> object URLs. Nothing is uploaded anywhere, and data is not shared between
> browsers, devices or people.

## Commands

Requirements: Node.js 20.9+ (tested on Node 22.23).

```bash
npm install
npm run dev          # development server, http://localhost:3000
npm run build        # production build
npm start            # serve the production build (http://localhost:3000)

npm run typecheck    # TypeScript, strict
npm run lint         # ESLint (eslint-config-next: core-web-vitals + typescript)
npm test             # unit tests (Vitest) — domain rules, storage, repositories
npm run test:e2e     # browser tests (Playwright) against the production build
```

End-to-end tests start `npm start` on port 3200 (or reuse a server already
running there), so run `npm run build` first. They need Chromium:
`npx playwright install chromium`, or point `PLAYWRIGHT_CHROMIUM_PATH` at an
installed Chromium binary. Run a single file with
`npx playwright test e2e/project-workflow.spec.ts`. The responsive sweep
(`e2e/responsive.spec.ts`, 11 widths × 31 routes) takes several minutes.

## Deploy to Vercel

1. Put this folder in a Git repository and import it in Vercel
   (**Add New → Project**). The Next.js preset is detected automatically.
2. Set `NEXT_PUBLIC_SITE_URL` to the real domain (e.g. `https://example.com`)
   so canonical links, hreflang, Open Graph and the sitemap use it. Without it,
   Vercel's production domain is used automatically (locally: `http://localhost:3000`).

Each visitor gets their own copy of the demo data in their browser, so people
viewing a deployed prototype do not see each other's edits.

## What is included

**Public site** (`/ru`, `/ky`, `/uz`; `/` redirects to the default language)

| Route | Page |
| --- | --- |
| `/{locale}` | Home: hero with featured projects (pausable), statement, featured selection, services, process, contacts |
| `/{locale}/projects` | Portfolio: category filters, search, grid and list views; filters live in the URL |
| `/{locale}/projects/{slug}` | Project page: cover, facts, description, gallery with lightbox, next project |
| `/{locale}/services` | Visible services in admin order |
| `/{locale}/about` | Studio and principles |
| `/{locale}/process` | Six work stages |
| `/{locale}/contacts` | WhatsApp, Instagram, cities, a form that opens WhatsApp with a prepared message |
| any unknown URL | 404 in the page's language; outside a language, in all three languages |

**First-visit intro.** The first public page opened in a browser session shows a
1.5 s intro (the HERMITAGE wordmark, a drawn rule, "Interior Design") on
espresso, then fades into the page. It is not shown again on navigation,
language switches or reloads in that session (`sessionStorage` key
`hermitage.intro.v1`), and never for visitors who prefer reduced motion. A tiny
inline script in `src/components/public/site-intro.tsx` decides before the
first paint and sets `data-intro="play"` on `<html>`; the animation itself is
CSS (`.site-intro` in `globals.css`), ignores pointer events and is hidden from
screen readers, so it never blocks the page. To replay it, clear the key in
DevTools or open a new tab.

**Admin panel** (`/admin`, labelled DEMO MODE)

- Dashboard computed from the data: totals, published/drafts/featured,
  projects by category, items needing attention, recent activity, quick actions.
- Projects: search, filters (status, category, featured), inline category
  change, featured toggle, publish/unpublish, duplicate, delete with
  confirmation, reorder (drag and drop or move up/down).
- Project editor: RU/KY/UZ tabs with completion and error markers, per-field
  validation, slug generated from the Russian title, cover and gallery upload
  with progress, image ordering, library picker, preview in three languages,
  draft/published status, featured toggle, unsaved-changes protection.
- Services: create, edit, delete, reorder, show/hide, three languages.
- Media library: upload, usage count, delete local images.
- Settings: studio name, logo preview, WhatsApp, Instagram, cities, default
  language, homepage SEO per language, reset demo data.
- The admin interface itself switches between RU / KY / UZ.

### Publication rules

- Only `published` projects appear on the site; drafts stay in the panel and
  their URLs show "not found".
- Publishing needs title, city and description in **all three languages** and
  a cover, so a public page never mixes languages. A draft only needs a
  Russian title and a valid slug.
- Featured + published projects feed the homepage hero and featured section.
- Visible services also need all three languages.

## Architecture

```
src/
  app/
    (entry)/               "/" — its own root layout; redirects to the default language
    [locale]/              Public site root layout (<html lang> per language), pages,
                           localized not-found, error boundary, [...rest] catch-all
    admin/                 Admin root layout, pages, error boundary
    global-not-found.tsx   404 for URLs outside any language (experimental flag)
    fonts.ts, shared-metadata.ts, globals.css
  proxy.ts                 Rewrites /<unknown-language>/… to the global 404
  components/public/       Public UI (receives its strings from the server layout)
  components/admin/        Admin UI (React Hook Form + Zod)
  components/shared/       SmartImage, Modal, Logo
  hooks/use-data.ts        Hooks over repositories (query + subscribe, client cache)
  lib/domain/              Types, Zod storage schemas, validation, media rules
  lib/i18n/                Locales, formatting; dictionaries in lib/i18n/dictionaries
  lib/repositories/
    types.ts               Repository interfaces — the contract the UI uses
    index.ts               Chooses implementations (the only place to swap them)
    mock/                  localStorage + IndexedDB implementations
  lib/seed/                Initial demo dataset
  __tests__/, **/*.test.ts Unit tests (Vitest)
e2e/                       Browser tests (Playwright) and image fixtures
```

Key decisions:

- **One source of truth.** UI code never touches localStorage or IndexedDB; it
  calls repositories through hooks. Every repository method is async and every
  repository has `subscribe()` (like Firestore's `onSnapshot`). Other tabs are
  kept in sync through the `storage` event.
- **Shared validation.** Rules live in `lib/domain/validation.ts` as plain
  functions; forms (through Zod `superRefine`) and repositories run the same code.
- **Several root layouts.** The public site, the admin and `/` each have their
  own root layout, so the server renders the correct `<html lang>` for
  `/ru`, `/ky` and `/uz`. Navigating between the site and the admin is a full
  page load.
- **Translations stay on the server.** The public layout passes only the current
  language's public strings to the client; admin strings and the other two
  languages are not in public JavaScript. The admin loads all dictionaries
  because its language can be switched live.
- **Client-side content.** Public pages read content in the browser (that is
  where the demo data lives). Server HTML contains the page frame and default
  metadata; the content appears after hydration.

## SEO

- **Per page:** title and description in the page's language, canonical URL,
  `hreflang` alternates (ru, ky, uz, x-default), Open Graph and Twitter tags,
  correct `<html lang>`. Project pages get their own title and description
  from the project data on the server; published projects are pre-rendered.
- **Preview image:** `/{locale}/opengraph-image` renders the HERMITAGE
  wordmark with the localized tagline (fonts in `src/assets/og`, SIL OFL).
  No demo photograph is used as the studio's image.
- **Structured data:** the home page includes schema.org `ProfessionalService`
  JSON-LD (name, WhatsApp, Instagram, cities served). No street address is
  published because none was provided.
- **`/sitemap.xml`** lists every public page and published project in all
  three languages with hreflang; drafts and `/admin` are excluded.
  **`/robots.txt`** allows the site and disallows `/admin`.
- **Limits of the demo:** search engines see the built-in content. Edits made
  in the demo admin live in one browser, so they cannot reach the sitemap,
  metadata or crawlers; with a backend, read published content on the server
  (`generateMetadata`, `sitemap.ts`) instead of the seed data. Page bodies
  render on the client; Google renders JavaScript, but other crawlers and link
  previews rely on the server-rendered metadata above.

## Data, images and security in the demo

**Persistence.** Each collection is one JSON document in localStorage
(`hermitage.demo.v1.*`), validated with Zod when loaded:

- invalid items in a collection are skipped and the valid ones kept;
- invalid JSON or an invalid settings document falls back to the seed data;
- before anything is discarded, the original is copied to `<key>.recovered`;
- a failed write (e.g. storage full) shows an error and changes nothing.

If localStorage is blocked, the app runs from memory and the admin shows a
warning that changes will be lost on reload.

**Images.**

- Accepted: JPEG, PNG, WebP, AVIF up to 8 MB. The file's first bytes must match
  a real image signature and the browser must be able to decode it, so renamed
  files are rejected. **SVG is not accepted**: an SVG shown through a `blob:` URL
  runs with the site's origin and could carry scripts.
- Stored image references must be `/demo/…`, `/brand/…`, `local:<id>` or
  `https://…`; anything else (e.g. `//host`, `javascript:`, `data:`) is dropped
  on save and never rendered.
- Local images exist only in this browser. Clearing site data removes them;
  projects then show a neutral placeholder, never a broken image. Images
  removed from projects stay in the media library until deleted there.

**Headers.** `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and
`Permissions-Policy` are set in `next.config.ts`. There is no Content-Security-Policy yet.

**What the demo does not protect.** Anyone who knows `/admin` can open it;
`robots: noindex` only keeps it out of search engines. Every visitor edits only
their own browser copy, so the demo cannot change what other people see.

## Moving to Firebase

Only the repository layer changes; pages and components stay as they are.

1. `npm install firebase`; add the web config as `NEXT_PUBLIC_FIREBASE_*`
   environment variables (they identify the project; access is controlled by
   Security Rules, not by hiding the config).
2. Create `src/lib/repositories/firebase/` implementing the interfaces in
   `src/lib/repositories/types.ts`:
   - `ProjectRepository` → collection `projects` (`where("status","==","published")`,
     `orderBy("order")`; `subscribe()` wraps `onSnapshot`; `reorder()` is a batched write).
   - `ServiceRepository` → collection `services`.
   - `SettingsRepository` → document `settings/site`.
   - `ActivityRepository` → collection `activity` (or written by Cloud Functions).
   - `MediaRepository` → Cloud Storage. `upload()` uses `uploadBytesResumable`
     (its progress events feed `onProgress`) and returns the `https://` download
     URL as the `ref`, which `isValidMediaRef` and `SmartImage` already accept.
     Keep `validateFile` (size, type, byte signature) and repeat the type/size
     limits in Storage Security Rules.
   - `PreferencesRepository` can stay local (per-browser interface settings).
3. In `src/lib/repositories/index.ts`, return the Firebase implementations
   instead of `createMockRepositories()`; `resetDemoData` is demo-only.
4. Add Firebase Authentication. Guard `/admin` in `src/app/admin/layout.tsx`
   and, more importantly, allow writes only to editors in Firestore and Storage
   Security Rules. Hiding the route is not security.
5. Re-run `validateProject` / `validateService` / `validateSettings` in a Cloud
   Function (or mirror them in Security Rules) so invalid data cannot be
   written directly.
6. For SEO, read published content on the server in the `[locale]` pages
   (`generateMetadata`, `generateStaticParams`, revalidation) instead of the
   client hooks used here.

## Production blockers

- Authentication and authorization for editors (see above).
- A real backend for content and images (Firestore + Storage or similar).
- Server-rendered public content from the backend (metadata and sitemap
  currently come from the built-in data, see SEO).
- A Content-Security-Policy tuned to the final hosting and analytics (the
  intro's inline script will then need a nonce or hash).
- Real studio content: logo, photographs, projects, texts, contacts/addresses.
- Native-speaker review of the Kyrgyz and Uzbek texts.
- `experimental.globalNotFound` is an experimental Next.js flag; re-check it on
  Next.js upgrades.

## Brand assets

No logo file was supplied, so the site uses a typographic wordmark. To use the
original logo, put it in `public/brand/` and set `logo: "/brand/<file>"` in
`src/lib/seed/settings.ts`, then reset the demo data. A logo can also be
previewed in **Settings → Logo** (PNG/JPEG/WebP/AVIF, stored in this browser only).

## Demo content

All seeded projects are marked `isDemo` and labelled "Demo project" on cards,
in the list view, on project pages and in the hero. Their texts are invented
placeholders and the photographs are from Unsplash; they are not the studio's
work. Service, About and Process texts and the About photo are labelled as demo
content on their pages.

## Known limitations

- No authentication; data lives in one browser (see above).
- Public content renders on the client; a 404 inside a language is rendered by
  the client after the server responds with status 404.
- The unsaved-changes guard covers in-app links, buttons, dialogs and page
  reload/close. The browser's Back button is not intercepted.
- Two tabs editing the same item: the last save wins (no conflict detection).
- Kyrgyz and Uzbek texts should be reviewed by a native speaker.
