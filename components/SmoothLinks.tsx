'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Turns every internal <a> click into a client-side navigation (no full page
// reload) — including the anchors inside the server-rendered landing markup,
// which can't be Next <Link> components. External links, new-tab links,
// downloads, modified clicks and same-page hashes are left to the browser, and
// anything another handler already handled (e.preventDefault) is skipped.
export default function SmoothLinks() {
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (a.target === '_blank' || a.hasAttribute('download') || a.getAttribute('rel')?.includes('external')) return;

      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // external site

      // Same page: let hash links scroll natively; block bare "#" jumps.
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        if (!url.hash || url.hash === '#') e.preventDefault();
        return;
      }

      e.preventDefault();
      router.push(url.pathname + url.search + url.hash);
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [router]);

  return null;
}
