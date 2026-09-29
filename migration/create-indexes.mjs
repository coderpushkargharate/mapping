// Create MongoDB indexes based on the app's actual query patterns.
//   MONGODB_URI="mongodb+srv://..." node migration/create-indexes.mjs
//
// Only indexes that back real queries are created (no speculative indexes).

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'mappingg';
if (!uri) { console.error('MONGODB_URI is required.'); process.exit(1); }

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  // pins: listed ordered by `number`; looked up by id (already _id).
  await db.collection('pins').createIndex({ number: 1 });

  // leads: admin panel lists newest first; joined to a pin by pin_id.
  await db.collection('leads').createIndex({ created_at: -1 });
  await db.collection('leads').createIndex({ pin_id: 1 });

  // pins_history: listed newest first; restore looked up by history_id.
  await db.collection('pins_history').createIndex({ changed_at: -1 });
  await db.collection('pins_history').createIndex({ history_id: 1 }, { unique: true });

  // infra_types: deleted by `key`.
  await db.collection('infra_types').createIndex({ key: 1 });

  // users: login lookup by email (unique).
  await db.collection('users').createIndex({ email: 1 }, { unique: true });

  console.log('Indexes created.');
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
