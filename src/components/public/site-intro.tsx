import { IntroCleanup, IntroScript } from "./intro-client";

/**
 * First-visit intro (once per browser session).
 *
 * How it avoids flashes and hydration problems:
 *  - The overlay markup is always in the server HTML but hidden by CSS.
 *  - This tiny inline script runs while the HTML is parsed, before the first
 *    paint. On the first visit of the session it records the visit and sets
 *    `data-intro="play"` on <html>; only then does CSS show and animate the
 *    overlay. Later pages, locale switches and reloads skip it.
 *  - The animation is pure CSS (opacity/transform), so it neither waits for
 *    hydration nor blocks loading. The overlay ignores pointer events and is
 *    hidden from assistive technology, so the page is usable underneath.
 *  - Visitors who prefer reduced motion never see it.
 * If sessionStorage is unavailable the intro is simply skipped.
 */
export const INTRO_SESSION_KEY = "hermitage.intro.v1";

const INTRO_SCRIPT = `(function(){try{var k=${JSON.stringify(INTRO_SESSION_KEY)};if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,"1");if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;document.documentElement.setAttribute("data-intro","play")}catch(e){}})();`;

export function SiteIntro() {
  return (
    <>
      <IntroScript code={INTRO_SCRIPT} />
      <div className="site-intro" aria-hidden="true">
        <div className="site-intro__mark">
          <span className="site-intro__name">Hermitage</span>
          <span className="site-intro__rule" />
          <span className="site-intro__sub">Interior Design</span>
        </div>
      </div>
      <IntroCleanup />
    </>
  );
}
