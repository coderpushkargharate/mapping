'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import './site-header.css';

// The single header shared by every public page (home, blog, …) so the site
// looks like one product. Navigation is client-side (no reload) via <Link>, and
// "Sign in" opens the modal on the home page or routes home (?signin=1) elsewhere.
const LINKS = [
  { href: '/', label: 'Home', match: (p: string) => p === '/' },
  { href: '/map', label: 'Live map', match: (p: string) => p.startsWith('/map') },
  { href: '/blog', label: 'Blog', match: (p: string) => p.startsWith('/blog') },
  { href: '/#how', label: 'How it works', match: () => false },
  { href: '/#faq', label: 'FAQ', match: () => false },
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
            <span className="mark">M</span>
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
              <Link href="/team-editor-x7k2" className="shd-btn primary">Dashboard</Link>
            ) : (
              <>
                <button className="shd-btn link" onClick={signIn}>Sign in</button>
                <Link href="/map" className="shd-btn primary">Open live map</Link>
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
            <div className="row">
              {signedIn ? (
                <Link href="/team-editor-x7k2" className="shd-btn primary" onClick={() => setOpen(false)}>Dashboard</Link>
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
