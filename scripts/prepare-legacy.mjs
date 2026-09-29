// Build step: turn each original standalone HTML page into a JSON "bundle"
// (styles + stylesheet links + ordered scripts + body markup) that the
// <LegacyApp> client component boots inside the Next.js document.
//
// The ONLY transformations applied are the minimum needed to remove the
// Supabase service dependency and fix asset paths — the markup, styles and
// application logic are preserved byte-for-byte otherwise.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from 'node-html-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'legacy');

const SUPABASE_DOMAIN = 'https://kgnhxtrlccsyxmnmnokc.supabase.co';
// The old public anon key — now inert (our API ignores it), but we strip it so
// no Supabase token ships to the browser at all.
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtnbmh4dHJsY2NzeXhtbm1ub2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MDM2NjksImV4cCI6MjEwMzM3OTY2OX0.PDC3PpSYdNIz7dVJgpJzQO0EB5Ab-OR5Cy9vjqvZScg';

const PAGES = [
  { src: 'index.html', slug: 'public-map' },
  { src: 'team-editor-x7k2.html', slug: 'team-editor' },
  { src: 'mundhwa-map-3d.html', slug: 'map-3d' },
];

// Remove every trace of Supabase from what ships to the browser:
//  - the Supabase project domain -> same-origin (pre-boot hits our /rest/v1 route)
//  - the Supabase JS SDK CDN     -> our own drop-in client shim
//  - the public anon-key JWT     -> a harmless placeholder (our API ignores it)
// Also make img/ paths absolute so they resolve from any route depth.
function transform(text) {
  return text
    .split(SUPABASE_DOMAIN).join('')
    .split(SUPABASE_ANON_KEY).join('local')
    .split('https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js').join('/db-shim.js')
    .split('"img/').join('"/img/')
    .split("'img/").join("'/img/")
    .split('(img/').join('(/img/');
}

async function buildPage(page) {
  const raw = await readFile(join(ROOT, page.src), 'utf8');
  const root = parse(raw, { comment: false });

  // Collect stylesheet links (leaflet, maplibre, fonts, etc.).
  const headLinks = root
    .querySelectorAll('link[rel="stylesheet"]')
    .map((l) => transform(l.getAttribute('href') || ''))
    .filter(Boolean);

  // Collect all <style> blocks.
  const styles = root.querySelectorAll('style').map((s) => transform(s.innerHTML)).join('\n');

  // Collect scripts in document order (head first, then body — querySelectorAll
  // returns them in source order across the whole tree).
  const scripts = root.querySelectorAll('script').map((s) => {
    const src = s.getAttribute('src');
    if (src) {
      return { type: 'ext', src: transform(src), async: s.hasAttribute('async') || s.hasAttribute('defer') };
    }
    return { type: 'inline', code: transform(s.innerHTML) };
  });

  // Body markup with <style>/<script> stripped (handled separately above).
  const body = root.querySelector('body');
  body.querySelectorAll('script').forEach((s) => s.remove());
  body.querySelectorAll('style').forEach((s) => s.remove());
  const bodyHtml = transform(body.innerHTML);

  const bundle = { slug: page.slug, headLinks, styles, scripts, bodyHtml };
  await writeFile(join(OUT, `${page.slug}.json`), JSON.stringify(bundle));
  console.log(`  ${page.src} -> public/legacy/${page.slug}.json (${scripts.length} scripts, ${headLinks.length} css links)`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const p of PAGES) await buildPage(p);
  console.log('Legacy bundles ready.');
}

main().catch((e) => { console.error(e); process.exit(1); });
