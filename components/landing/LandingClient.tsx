'use client';

import { useEffect } from 'react';

// Boots the landing page behaviour. Loads three.js (for the hero globe) first,
// then /landing.js which wires up the nav, reveal-on-scroll, interactive sample
// map, live-map trial and the auth modal. Both are injected once; the landing
// script is a self-contained IIFE so a re-run never clashes with globals.
export default function LandingClient() {
  useEffect(() => {
    function loadScript(src: string, marker: string): Promise<void> {
      return new Promise((resolve) => {
        // A tag may already exist from an earlier run of this effect (React Strict
        // Mode runs it twice) that is still downloading — wait for it rather than
        // resolving early, or landing.js would start before three.js is ready.
        const existing = document.querySelector<HTMLScriptElement>(`script[${marker}]`);
        if (existing) {
          if (existing.dataset.done) return resolve();
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => resolve());
          return;
        }
        const el = document.createElement('script');
        el.src = src;
        el.setAttribute(marker, '');
        const done = () => { el.dataset.done = '1'; resolve(); };
        el.onload = done;
        el.onerror = done; // degrade gracefully — the globe simply won't render
        document.body.appendChild(el);
      });
    }

    let cancelled = false;
    (async () => {
      // three.js powers only the decorative hero globe; awaited so it exists first,
      // but a failure never blocks the rest of the page.
      await loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
        'data-mpg-three',
      );
      if (cancelled) return;
      await loadScript('/landing.js', 'data-mpg-landing');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
