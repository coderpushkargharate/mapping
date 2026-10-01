import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import './admin.css';
import { getCurrentUser } from '@/lib/auth';

// The whole super-admin area is gated here: no valid session → the dedicated
// sign-in page, which returns here after a successful login. Never indexed.
export const metadata: Metadata = {
  title: 'Super Admin — Mappingg',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/signin?next=/s-admin');

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      {children}
    </>
  );
}
