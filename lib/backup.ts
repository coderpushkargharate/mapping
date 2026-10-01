import { gzipSync, gunzipSync } from 'node:zlib';
import { GridFSBucket, ObjectId, type Db } from 'mongodb';
import { getDb } from './mongodb';

// Whole-database backups for the super-admin "Backups" tab.
//
// - A snapshot is every collection's documents as one gzipped JSON file, kept
//   in a GridFS bucket ("backups") inside the same database.
// - One is taken automatically per day (when an admin opens the tab — no cron
//   needed) and on demand. The newest KEEP_SNAPSHOTS are kept.
// - Password hashes are never written into a backup or a download.

export const KEEP_SNAPSHOTS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const BUCKET = 'backups';
type AnyDoc = { _id: unknown; [k: string]: unknown };

export interface SnapshotInfo {
  id: string;
  created_at: string;
  reason: 'auto' | 'manual';
  size: number;
  counts: Record<string, number>;
}
export type BackupData = Record<string, Record<string, unknown>[]>;

/** Collections included in a backup: everything except the backup store itself. */
async function backupCollections(db: Db): Promise<string[]> {
  const all = await db.listCollections({}, { nameOnly: true }).toArray();
  return all
    .map((c) => c.name)
    .filter((n) => !n.startsWith('system.') && !n.startsWith(`${BUCKET}.`))
    .sort();
}

function sanitize(collection: string, doc: AnyDoc): Record<string, unknown> {
  const out: Record<string, unknown> = { ...doc };
  if (collection === 'users') delete out.password_hash;
  return out;
}

/** Every collection's documents, as plain JSON-safe objects. */
export async function collectAll(): Promise<{ data: BackupData; counts: Record<string, number> }> {
  const db = await getDb();
  const data: BackupData = {};
  const counts: Record<string, number> = {};
  for (const name of await backupCollections(db)) {
    const rows = await db.collection<AnyDoc>(name).find({}).toArray();
    data[name] = rows.map((r) => sanitize(name, r));
    counts[name] = rows.length;
  }
  return { data, counts };
}

export async function liveCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const counts: Record<string, number> = {};
  for (const name of await backupCollections(db)) counts[name] = await db.collection(name).countDocuments({});
  return counts;
}

function bucket(db: Db) {
  return new GridFSBucket(db, { bucketName: BUCKET });
}

function toInfo(f: { _id: ObjectId; length: number; uploadDate: Date; metadata?: Record<string, unknown> }): SnapshotInfo {
  const m = f.metadata || {};
  return {
    id: String(f._id),
    created_at: (m.created_at as string) || f.uploadDate.toISOString(),
    reason: m.reason === 'auto' ? 'auto' : 'manual',
    size: f.length,
    counts: (m.counts as Record<string, number>) || {},
  };
}

export async function listSnapshots(): Promise<SnapshotInfo[]> {
  const db = await getDb();
  const files = await db.collection(`${BUCKET}.files`).find({}).sort({ uploadDate: -1 }).toArray();
  return files.map((f) => toInfo(f as never));
}

export async function createSnapshot(reason: 'auto' | 'manual'): Promise<SnapshotInfo> {
  const db = await getDb();
  const { data, counts } = await collectAll();
  const created_at = new Date().toISOString();
  const gz = gzipSync(Buffer.from(JSON.stringify({ created_at, reason, data })));
  const filename = `mappingg-backup-${created_at.replace(/[:.]/g, '-')}.json.gz`;

  const b = bucket(db);
  const id: ObjectId = await new Promise((resolve, reject) => {
    const up = b.openUploadStream(filename, { metadata: { created_at, reason, counts } });
    up.once('finish', () => resolve(up.id as ObjectId));
    up.once('error', reject);
    up.end(gz);
  });

  // Retention: keep only the newest KEEP_SNAPSHOTS.
  const old = await db.collection(`${BUCKET}.files`).find({}).sort({ uploadDate: -1 }).skip(KEEP_SNAPSHOTS).toArray();
  for (const f of old) await b.delete(f._id as ObjectId).catch(() => {});

  return { id: String(id), created_at, reason, size: gz.length, counts };
}

/** Takes the daily automatic backup if the newest one is more than a day old. */
export async function ensureDailySnapshot(): Promise<SnapshotInfo | null> {
  const [latest] = await listSnapshots();
  if (latest && Date.now() - new Date(latest.created_at).getTime() < DAY_MS) return null;
  return createSnapshot('auto');
}

export async function readSnapshotGz(id: string): Promise<{ gz: Buffer; info: SnapshotInfo } | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await getDb();
  const f = await db.collection(`${BUCKET}.files`).findOne({ _id: new ObjectId(id) });
  if (!f) return null;
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    bucket(db).openDownloadStream(new ObjectId(id))
      .on('data', (c: Buffer) => chunks.push(c))
      .once('end', () => resolve())
      .once('error', reject);
  });
  return { gz: Buffer.concat(chunks), info: toInfo(f as never) };
}

export async function readSnapshot(id: string): Promise<{ data: BackupData; info: SnapshotInfo } | null> {
  const r = await readSnapshotGz(id);
  if (!r) return null;
  const parsed = JSON.parse(gunzipSync(r.gz).toString('utf8')) as { data: BackupData };
  return { data: parsed.data || {}, info: r.info };
}
