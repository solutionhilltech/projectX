import { MongoClient, type Db } from "mongodb";
import type { Business, SettingsForm } from "@/lib/types";

function mongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");
  return uri;
}

// Cached across requests (and hot reloads) so we don't open a new connection per call.
// Single-flighted: concurrent callers await the same in-flight connect instead of
// each independently closing/replacing the shared client (that race threw
// MongoTopologyClosedError when two requests landed at once).
let clientPromise: Promise<MongoClient> | null = null;

async function getDb(): Promise<Db> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new MongoClient(mongoUri());
      await client.connect();
      return client;
    })();
  }
  try {
    const client = await clientPromise;
    return client.db();
  } catch (err) {
    clientPromise = null;
    throw err;
  }
}

export async function getDatabaseStatus(): Promise<{ connected: boolean; error: string | null }> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return { connected: true, error: null };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getBusinesses(): Promise<Business[]> {
  const db = await getDb();
  const docs = await db
    .collection<Business>("businesses")
    .find()
    .project({ _id: 0 })
    .sort({ queried_at: -1 })
    .toArray();
  return docs as unknown as Business[];
}

/** Upserts by place_id — no-op if that business is already saved. */
export async function saveBusiness(business: Business): Promise<void> {
  const db = await getDb();
  await db
    .collection("businesses")
    .updateOne({ place_id: business.place_id }, { $setOnInsert: business }, { upsert: true });
}

export async function getBusinessesWithWebsite(): Promise<Business[]> {
  const businesses = await getBusinesses();
  return businesses.filter((b) => b.website !== null && b.website !== "");
}

export async function updateRedesignResult(
  place_id: string,
  update: Partial<Pick<Business, "redesign_status" | "redesign_prompt" | "redesign_image_urls" | "stitch_project_id" | "redesigned_at">>
): Promise<void> {
  await updateBusiness(place_id, update);
}

/** Partial update by place_id — used by the redesign and WhatsApp-delivery steps. */
export async function updateBusiness(place_id: string, patch: Partial<Business>): Promise<void> {
  const db = await getDb();
  await db.collection("businesses").updateOne({ place_id }, { $set: patch });
}

/** Removes a business from the saved database. */
export async function deleteBusiness(place_id: string): Promise<void> {
  const db = await getDb();
  await db.collection("businesses").deleteOne({ place_id });
}

/** Step 3 candidates: redesign finished, not yet successfully messaged. */
export async function getBusinessesReadyForWhatsapp(): Promise<Business[]> {
  const businesses = await getBusinesses();
  return businesses.filter(
    (b) => b.redesign_status === "done" && b.whatsapp_status !== "sent" && b.phone_number
  );
}

const DEFAULT_SETTINGS: SettingsForm = {
  openrouter_api_key: "",
  search_provider: "google",
  google_places_api_key: "",
  serper_api_key: "",
  whatsapp_access_token: "",
  whatsapp_phone_number_id: "",
  stitch_refresh_token: "",
};

/** Single settings document, same pattern as the single auth_users record. */
export async function getSettings(): Promise<SettingsForm> {
  const db = await getDb();
  const stored = (await db.collection<SettingsForm>("settings").findOne({}, { projection: { _id: 0 } })) ?? DEFAULT_SETTINGS;
  // .env.local seeds these until the user saves overrides via Settings.
  return {
    ...stored,
    openrouter_api_key: stored.openrouter_api_key || process.env.OPENROUTER_API_KEY || "",
    google_places_api_key: stored.google_places_api_key || process.env.GOOGLE_PLACES_API_KEY || "",
    whatsapp_access_token: stored.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN || "",
    whatsapp_phone_number_id: stored.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    stitch_refresh_token: stored.stitch_refresh_token || "",
  };
}

/** Merges only non-blank fields, so blanks keep the current stored value. */
export async function saveSettings(patch: Partial<SettingsForm>): Promise<SettingsForm> {
  const current = await getSettings();
  const next = { ...current };
  for (const [key, value] of Object.entries(patch) as [keyof SettingsForm, string][]) {
    if (value !== "") next[key] = value;
  }
  const db = await getDb();
  await db.collection("settings").updateOne({}, { $set: next }, { upsert: true });
  return next;
}

export interface AuthUser {
  username: string;
  salt: string;
  hash: string;
}

/**
 * The single operator credential for the login page, stored as a
 * scrypt(password, salt) hash — never plain text. Seed it with
 * `node scripts/seed-admin.mjs <username> <password>`, which writes into the
 * `auth_users` collection of the database `MONGODB_URI` points at.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const db = await getDb();
  return db.collection<AuthUser>("auth_users").findOne({}, { projection: { _id: 0 } });
}
