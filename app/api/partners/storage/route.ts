import { NextRequest, NextResponse } from 'next/server';
import { GridFSBucket } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getStaffUser } from '@/lib/auth';
import { tokenIsValid } from '@/lib/partners-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'partners_media';
const BUCKETS = new Set(['submission-media', 'project-media']);
const MAX_BYTES = 25 * 1024 * 1024;

function key(bucket: string, path: string) { return `${bucket}/${path}`; }

async function bucket() {
  const db = await getDb();
  return { db, gfs: new GridFSBucket(db, { bucketName: BUCKET }) };
}

// ----------------------------------------------------------------- upload
export async function POST(req: NextRequest) {
  let form: FormData;
  try { form = await req.formData(); } catch {
    return NextResponse.json({ data: null, error: { message: 'Invalid upload' } }, { status: 400 });
  }
  const bucketName = String(form.get('bucket') || '');
  const path = String(form.get('path') || '');
  const file = form.get('file');
  const contentType = String(form.get('contentType') || '') || (file instanceof File ? file.type : '') || 'application/octet-stream';

  if (!BUCKETS.has(bucketName) || !path || !(file instanceof File)) {
    return NextResponse.json({ data: null, error: { message: 'Missing bucket, path or file' } }, { status: 400 });
  }

  // Authorize: a signed-in admin may upload anywhere; a builder may upload only
  // under their own active link folder (submission-media/links/<token>/…).
  const user = await getStaffUser();
  let allowed = !!user;
  if (!allowed) {
    const token = req.nextUrl.searchParams.get('t');
    if (token && bucketName === 'submission-media' && path.startsWith(`links/${token}/`)) {
      allowed = await tokenIsValid(token);
    }
  }
  if (!allowed) return NextResponse.json({ data: null, error: { message: 'Not authorized' } }, { status: 401 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ data: null, error: { message: 'File is larger than 25 MB.' } }, { status: 413 });
  }

  const { db, gfs } = await bucket();
  const filename = key(bucketName, path);
  // Overwrite semantics: drop any existing versions of this exact key first.
  const existing = await db.collection(`${BUCKET}.files`).find({ filename }).toArray();
  for (const f of existing) { try { await gfs.delete(f._id as any); } catch { /* ignore */ } }

  await new Promise<void>((resolve, reject) => {
    const up = gfs.openUploadStream(filename, { contentType, metadata: { bucket: bucketName, path } });
    up.on('error', reject);
    up.on('finish', () => resolve());
    up.end(buf);
  });

  return NextResponse.json({ data: { path }, error: null });
}

// ----------------------------------------------------------------- serve
export async function GET(req: NextRequest) {
  const bucketName = req.nextUrl.searchParams.get('bucket') || '';
  const path = req.nextUrl.searchParams.get('path') || '';
  const isPublic = req.nextUrl.searchParams.get('public') === '1';
  if (!BUCKETS.has(bucketName) || !path) {
    return NextResponse.json({ error: { message: 'Missing bucket or path' } }, { status: 400 });
  }

  // project-media is public (shown on the live map); everything else is private.
  if (!(isPublic && bucketName === 'project-media')) {
    if (!(await getStaffUser())) return NextResponse.json({ error: { message: 'Not authorized' } }, { status: 401 });
  }

  const { db, gfs } = await bucket();
  const filename = key(bucketName, path);
  const fileDoc = await db.collection(`${BUCKET}.files`).findOne({ filename }, { sort: { uploadDate: -1 } });
  if (!fileDoc) return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });

  const chunks: Buffer[] = await new Promise((resolve, reject) => {
    const parts: Buffer[] = [];
    gfs.openDownloadStream(fileDoc._id as any)
      .on('data', (c: Buffer) => parts.push(c))
      .on('error', reject)
      .on('end', () => resolve(parts));
  });
  const body = Buffer.concat(chunks);
  const ct = (fileDoc as any).contentType || (fileDoc as any).metadata?.contentType || 'application/octet-stream';
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type': ct,
      'Content-Length': String(body.byteLength),
      'Cache-Control': isPublic ? 'public, max-age=3600' : 'private, no-store',
    },
  });
}
