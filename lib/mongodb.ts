import { MongoClient, Db } from 'mongodb';

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

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export default clientPromise;
