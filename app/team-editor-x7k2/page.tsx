import type { Metadata } from 'next';
import LegacyApp from '@/components/LegacyApp';

// Admin editor — never indexed. Access is gated client-side by the sign-in
// overlay, and every write is enforced server-side by the authenticated API.
export const metadata: Metadata = {
  title: 'Team Editor',
  robots: { index: false, follow: false, nocache: true },
};

export default function TeamEditorPage() {
  return <LegacyApp slug="team-editor" />;
}
