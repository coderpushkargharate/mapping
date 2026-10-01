'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import './site-header.css';

// The single header shared by every public page (home, blog, …) so the site
// looks like one product. Navigation is client-side (no reload) via <Link>, and
// "Sign in" opens the full auth modal: in-place on the home page (via a window
// event), or by routing home with ?signin=1 (also reachable directly at /signin).
const LINKS = [
  { href: '/', label: 'Home', match: (p: string) => p === '/' },
  { href: '/map', label: 'Live map', match: (p: string) => p === '/map' || p.startsWith('/map/') },
  { href: '/how-it-works', label: 'How it works', match: (p: string) => p === '/how-it-works' },
  { href: '/features', label: 'Features', match: (p: string) => p === '/features' },
  { href: '/blog', label: 'Blog', match: (p: string) => p.startsWith('/blog') },
  { href: '/contact', label: 'Contact', match: (p: string) => p === '/contact' },
];
// Secondary links shown only in the mobile menu, where the footer is a long scroll away.
const MORE_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/careers', label: 'Careers' },
  { href: '/advertise', label: 'Advertise' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/map-data', label: 'Map data' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // Real session (owner/employee) → show Dashboard instead of Sign in.
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((b) => setSignedIn(!!(b && b.session)))
      .catch(() => setSignedIn(false));
  }, [pathname]);

  function signIn() {
    setOpen(false);
    if (pathname === '/') window.dispatchEvent(new Event('mpg:open-signin'));
    else router.push('/?signin=1');
  }

  return (
    <header className={`shd${scrolled ? ' scrolled' : ''}`}>
      <div className="shd-wrap">
        <div className="shd-bar">
          <Link href="/" className="shd-brand" aria-label="Mappingg home" onClick={() => setOpen(false)}>
            <span className="mark" aria-hidden="true" />
            <b>Mappingg<em>.com</em></b>
          </Link>

          <nav className="shd-menu">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={l.match(pathname) ? 'active' : ''}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="shd-right">
            {signedIn ? (
              <Link href="/s-admin" className="shd-btn primary">Dashboard</Link>
            ) : (
              <>
                <button className="shd-btn link" onClick={signIn}>Sign in</button>
                <Link href="/map" className="shd-btn primary">Open live map <svg className="ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg></Link>
              </>
            )}
            <button
              className="shd-burger"
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden="true">{open ? '✕' : '☰'}</span>
            </button>
          </div>

          <div className={`shd-mobile${open ? ' open' : ''}`}>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={l.match(pathname) ? 'active' : ''} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <div className="shd-more">
              {MORE_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={pathname === l.href ? 'active' : ''} onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="row">
              {signedIn ? (
                <Link href="/s-admin" className="shd-btn primary" onClick={() => setOpen(false)}>Dashboard</Link>
              ) : (
                <>
                  <button className="shd-btn link" onClick={signIn}>Sign in</button>
                  <Link href="/map" className="shd-btn primary" onClick={() => setOpen(false)}>Open live map</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
