import { randomUUID } from 'crypto';
import type { Db } from 'mongodb';
import { getDb } from './mongodb';

// Our documents use string uuid _id values (not ObjectId), so we type
// collections loosely to keep the driver's strict _id typing out of the way.
type AnyDoc = { _id: string;[key: string]: any };
function getColl(db: Db, name: string) {
  return db.collection<AnyDoc>(name);
}

// -----------------------------------------------------------------------------
// MongoDB query engine that reproduces the exact subset of Supabase/PostgREST
// behaviour the original site relies on. The client-side Supabase shim
// (public/supabase-shim.js) serialises every .from().select()/insert()/update()/
// delete() call into one of these operations and POSTs it to /api/db.
// -----------------------------------------------------------------------------

export type Filter =
  | { op: 'eq'; col: string; val: unknown }
  | { op: 'in'; col: string; vals: unknown[] };

export interface DbOp {
  table: string;
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  columns?: string;
  filters?: Filter[];
  order?: { col: string; ascending: boolean };
  limit?: number;
  single?: boolean;
  values?: Record<string, unknown> | Record<string, unknown>[];
  returning?: boolean;
}

export interface DbResult {
  data: unknown;
  error: { message: string; code?: string } | null;
  status: number;
}

const PUBLIC_READ = new Set([
  'pins',
  'infra_markers',
  'roads',
  'map_settings',
  'infra_types',
  'area_boundaries',
]);

// Tables the client is never allowed to write to directly (history is captured
// server-side, mirroring the original database trigger).
const CLIENT_WRITABLE = new Set([
  'pins',
  'infra_markers',
  'roads',
  'map_settings',
  'infra_types',
  'area_boundaries',
  'leads',
]);

function err(message: string, status: number, code?: string): DbResult {
  return { data: null, error: { message, code }, status };
}

/** Strip Mongo's internal _id so rows look exactly like the Supabase originals. */
function clean<T extends Record<string, unknown>>(doc: T | null): T | null {
  if (!doc) return doc;
  const { _id, ...rest } = doc as Record<string, unknown>;
  return rest as T;
}

function buildQuery(filters?: Filter[]): Record<string, unknown> {
  const q: Record<string, unknown> = {};
  for (const f of filters || []) {
    if (f.op === 'eq') q[f.col] = f.val;
    else if (f.op === 'in') q[f.col] = { $in: f.vals };
  }
  return q;
}

function buildProjection(columns?: string): Record<string, 0 | 1> | undefined {
  if (!columns || columns.trim() === '*' || columns.includes('*')) return undefined;
  const cols = columns
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  if (!cols.length) return undefined;
  const proj: Record<string, 0 | 1> = {};
  for (const c of cols) proj[c] = 1;
  proj.id = 1; // always keep the primary key
  return proj;
}

function authorize(op: DbOp, isAuthed: boolean): DbResult | null {
  const { table, action } = op;

  if (action === 'select') {
    if (PUBLIC_READ.has(table)) return null;
    // leads + pins_history are private.
    if (!isAuthed) return err('Not authorized', 401);
    return null;
  }

  // Writes:
  if (table === 'leads' && action === 'insert') return null; // public lead capture
  if (!CLIENT_WRITABLE.has(table)) return err('Table is not writable', 403);
  if (!isAuthed) return err('Not authorized', 401);
  return null;
}

/** Snapshot a pin into pins_history before it is changed or removed. */
async function captureHistory(
  db: Awaited<ReturnType<typeof getDb>>,
  pinDoc: Record<string, unknown> | null,
  operation: 'update' | 'delete',
) {
  if (!pinDoc) return;
  const row = clean(pinDoc as Record<string, unknown>);
  await getColl(db, 'pins_history').insertOne({
    _id: randomUUID(),
    history_id: randomUUID(),
    pin_id: (pinDoc as { id?: unknown }).id,
    operation,
    row_data: row,
    changed_at: new Date().toISOString(),
  });
}

export async function runDbOp(op: DbOp, isAuthed: boolean): Promise<DbResult> {
  const denied = authorize(op, isAuthed);
  if (denied) return denied;

  const db = await getDb();
  const coll = getColl(db, op.table);

  try {
    switch (op.action) {
      case 'select': {
        const query = buildQuery(op.filters);
        const projection = buildProjection(op.columns);
        let cursor = coll.find(query, projection ? { projection } : undefined);
        if (op.order) cursor = cursor.sort({ [op.order.col]: op.order.ascending ? 1 : -1 });
        if (op.limit != null) cursor = cursor.limit(op.limit);
        const rows = (await cursor.toArray()).map((d) => clean(d as Record<string, unknown>));
        if (op.single) {
          if (rows.length === 0) return err('No rows found', 406, 'PGRST116');
          return { data: rows[0], error: null, status: 200 };
        }
        return { data: rows, error: null, status: 200 };
      }

      case 'insert': {
        const input = Array.isArray(op.values) ? op.values : [op.values || {}];
        const now = new Date().toISOString();
        const docs = input.map((v) => {
          const doc: Record<string, any> = { ...(v as Record<string, unknown>) };
          if (doc.id == null) doc.id = randomUUID();
          if (doc.created_at == null) doc.created_at = now;
          if ('updated_at' in doc === false && op.table !== 'leads') doc.updated_at = now;
          doc._id = String(doc.id);
          return doc as AnyDoc;
        });
        await coll.insertMany(docs);
        if (op.returning || op.single) {
          const out = docs.map((d) => clean(d));
          return { data: op.single ? out[0] : out, error: null, status: 201 };
        }
        return { data: null, error: null, status: 201 };
      }

      case 'update': {
        const query = buildQuery(op.filters);
        const patch = { ...(op.values as Record<string, unknown>) };
        delete patch.id;
        delete patch._id;
        if (op.table !== 'leads') patch.updated_at = new Date().toISOString();

        // History capture for pins (mirrors the original DB trigger).
        if (op.table === 'pins') {
          const affected = await coll.find(query).toArray();
          for (const doc of affected) await captureHistory(db, doc as Record<string, unknown>, 'update');
        }

        await coll.updateMany(query, { $set: patch });
        if (op.returning || op.single) {
          const rows = (await coll.find(query).toArray()).map((d) => clean(d as Record<string, unknown>));
          return { data: op.single ? rows[0] ?? null : rows, error: null, status: 200 };
        }
        return { data: null, error: null, status: 200 };
      }

      case 'delete': {
        const query = buildQuery(op.filters);
        if (op.table === 'pins') {
          const affected = await coll.find(query).toArray();
          for (const doc of affected) await captureHistory(db, doc as Record<string, unknown>, 'delete');
        }
        await coll.deleteMany(query);
        return { data: null, error: null, status: 200 };
      }

      case 'upsert': {
        const input = Array.isArray(op.values) ? op.values : [op.values || {}];
        const now = new Date().toISOString();
        for (const v of input) {
          const doc: Record<string, any> = { ...(v as Record<string, unknown>) };
          if (doc.id == null) doc.id = randomUUID();
          if (doc.created_at == null) doc.created_at = now;
          if (op.table !== 'leads') doc.updated_at = now;
          doc._id = String(doc.id);
          await coll.replaceOne({ _id: doc._id }, doc, { upsert: true });
        }
        return { data: null, error: null, status: 200 };
      }

      default:
        return err('Unsupported action', 400);
    }
  } catch (e) {
    console.error('[db-engine]', op.table, op.action, e);
    return err('Database error', 500);
  }
}

/** Server-side equivalent of the Supabase RPC restore_pin_from_history. */
export async function restorePinFromHistory(historyId: string, isAuthed: boolean): Promise<DbResult> {
  if (!isAuthed) return err('Not authorized', 401);
  const db = await getDb();
  const entry = await getColl(db, 'pins_history').findOne({ history_id: historyId });
  if (!entry) return err('History entry not found', 404);
  const row = (entry.row_data || {}) as Record<string, unknown>;
  if (!row.id) return err('History entry has no pin data', 422);
  const doc = { ...row, _id: row.id as string, updated_at: new Date().toISOString() };
  await getColl(db, 'pins').replaceOne({ _id: row.id as string }, doc, { upsert: true });
  return { data: clean(doc), error: null, status: 200 };
}
