import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { runDbOp, type DbOp } from '@/lib/db-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const filterSchema = z.union([
  z.object({ op: z.literal('eq'), col: z.string(), val: z.unknown() }),
  z.object({ op: z.literal('in'), col: z.string(), vals: z.array(z.unknown()) }),
]);

const opSchema = z.object({
  table: z.string().regex(/^[a-z_]+$/), // whitelist-safe identifier, blocks injection
  action: z.enum(['select', 'insert', 'update', 'delete', 'upsert']),
  columns: z.string().optional(),
  filters: z.array(filterSchema).optional(),
  order: z.object({ col: z.string(), ascending: z.boolean() }).optional(),
  limit: z.number().int().min(0).max(10000).optional(),
  single: z.boolean().optional(),
  values: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]).optional(),
  returning: z.boolean().optional(),
});

const PUBLIC_TABLES = new Set([
  'pins',
  'infra_markers',
  'roads',
  'map_settings',
  'infra_types',
  'area_boundaries',
]);

function invalid(details?: unknown) {
  return NextResponse.json({ data: null, error: { message: 'Invalid request', details } }, { status: 400 });
}

async function handle(op: DbOp) {
  const user = await getCurrentUser();
  const result = await runDbOp(op, !!user);
  const res = NextResponse.json({ data: result.data, error: result.error }, { status: result.status });

  // Cache only anonymous reads of public tables. Everything else stays private.
  if (op.action === 'select' && PUBLIC_TABLES.has(op.table) && !user) {
    res.headers.set('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=300');
  } else {
    res.headers.set('Cache-Control', 'private, no-store');
  }
  return res;
}

// Reads — cacheable by the browser/CDN. The op is passed as a JSON query param.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('op');
  if (!raw) return invalid('missing op');
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return invalid('bad op json');
  }
  const parsed = opSchema.safeParse(parsedJson);
  if (!parsed.success) return invalid(parsed.error.flatten());
  if (parsed.data.action !== 'select') return invalid('GET only supports select');
  return handle(parsed.data as DbOp);
}

// Writes (and any non-select op).
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Invalid JSON' } }, { status: 400 });
  }
  const parsed = opSchema.safeParse(body);
  if (!parsed.success) return invalid(parsed.error.flatten());
  return handle(parsed.data as DbOp);
}
