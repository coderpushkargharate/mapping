import type { Metadata } from 'next';

// The sign-in page is internal — never indexed.
export const metadata: Metadata = {
  title: 'Sign in — Mappingg',
  robots: { index: false, follow: false, nocache: true },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
