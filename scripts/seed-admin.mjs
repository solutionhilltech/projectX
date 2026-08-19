/**
 * One-off: hashes a username/password and upserts it into the `auth_users`
 * collection that src/lib/auth.ts checks logins against. Run with:
 *   node --env-file=.env.local scripts/seed-admin.mjs <username> <password>
 *
 * Overwrites any existing credential — there's only ever one operator record.
 */
import { randomBytes, scryptSync } from "crypto";
import { MongoClient } from "mongodb";

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error("Usage: node --env-file=.env.local scripts/seed-admin.mjs <username> <password>");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI in env.");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");

const client = new MongoClient(uri);
await client.connect();
const db = client.db();
await db.collection("auth_users").deleteMany({});
await db.collection("auth_users").insertOne({ username, salt, hash });
await client.close();

console.log(`Seeded admin login "${username}" into ${db.databaseName}.auth_users`);
