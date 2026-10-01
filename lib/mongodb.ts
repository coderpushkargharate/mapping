import dns from 'node:dns';
import { MongoClient, Db } from 'mongodb';

// mongodb+srv:// URIs need a DNS SRV lookup. On some Windows networks the only
// resolver is an IPv6 link-local address that Node can't use, so Node falls back
// to 127.0.0.1 and the lookup fails with `querySrv ECONNREFUSED`. When Node is
// left with only loopback resolvers, use public DNS instead (override with
// MONGODB_DNS_SERVERS, comma-separated).
const isLoopback = (s: string) => s === '::1' || s.startsWith('127.');
// The driver resolves SRV via dns.promises, which can hold its own resolver.
const applyDnsServers = (servers: string[]) => {
  dns.setServers(servers);
  dns.promises.setServers(servers);
};
if (process.env.MONGODB_DNS_SERVERS) {
  applyDnsServers(process.env.MONGODB_DNS_SERVERS.split(',').map((s) => s.trim()));
} else if (dns.getServers().every(isLoopback) || dns.promises.getServers().every(isLoopback)) {
  applyDnsServers(['8.8.8.8', '1.1.1.1']);
}

// Reusable, cached MongoDB connection for Next.js.
//
// In development the module is re-evaluated on every hot reload, which would
// otherwise open a brand-new connection pool each time and exhaust the server.
// We therefore cache the client promise on the Node global. In production the
// module is evaluated once, so a module-level cache is enough.

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'mappingg';

if (!uri) {
  throw new Error('MONGODB_URI is not set. Add it to .env.local (server-only).');
}

const options = {
  maxPoolSize: 10,
  // Fail fast instead of hanging a request when the cluster is unreachable.
  serverSelectionTimeoutMS: 8000,
};

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const moduleCache: { _mongoClientPromise?: Promise<MongoClient> } = {};

// A failed connect is dropped from the cache so the next request retries,
// instead of every request reusing the rejected promise until a restart
// (including one left on the global by an earlier hot-reloaded module).
async function getClient(): Promise<MongoClient> {
  const cache = process.env.NODE_ENV === 'development' ? global : moduleCache;
  const p = (cache._mongoClientPromise ??= new MongoClient(uri!, options).connect());
  try {
    return await p;
  } catch (e) {
    if (cache._mongoClientPromise === p) cache._mongoClientPromise = undefined;
    throw e;
  }
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}

export default getClient;
