import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { countPosts } from '@/lib/blog';
import { getPublicSettings } from '@/lib/site-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: { message: 'Not authorized' } }, { status: 401 });
  }

  let pins = 0, leads = 0, infra = 0, roads = 0, employees = 0, dbOk = true;
  try {
    const db = await getDb();
    [pins, leads, infra, roads, employees] = await Promise.all([
      db.collection('pins').countDocuments({}),
      db.collection('leads').countDocuments({}),
      db.collection('infra_markers').countDocuments({}),
      db.collection('roads').countDocuments({}),
      db.collection('users').countDocuments({ role: 'employee' }),
    ]);
  } catch {
    dbOk = false;
  }
  const posts = await countPosts();
  const settings = await getPublicSettings();

  return NextResponse.json({
    data: {
      dbOk,
      pins, leads, infra, roads, employees,
      posts,
      seo: {
        gsc: !!settings.search_console_verification,
        gtm: !!settings.gtm_container_id,
      },
    },
  });
}
