// Remembers which receipts have already been used to register, so the same
// payment can't be used by two different people. Backed by a private Vercel
// Blob store (BLOB_READ_WRITE_TOKEN). If the store isn't configured, every
// call is a no-op and the site keeps working without the cross-visitor check.
import { createHash } from "node:crypto";
import { get, put } from "@vercel/blob";

export const ledgerEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const pathFor = (key) => `receipts/${createHash("sha256").update(key).digest("hex")}.json`;

// Returns the stored record for a receipt key, or null if it hasn't been used.
export async function lookup(key) {
  if (!ledgerEnabled()) return null;
  try {
    const res = await get(pathFor(key), { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return JSON.parse(await new Response(res.stream).text());
  } catch (error) {
    console.error("ledger lookup failed:", error.message);
    return null;
  }
}

// Saves a receipt as used. `overwrite` is only set when the same device re-checks.
export async function record(key, data, overwrite = false) {
  if (!ledgerEnabled()) return;
  try {
    await put(pathFor(key), JSON.stringify(data), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: overwrite,
      contentType: "application/json",
    });
  } catch (error) {
    console.error("ledger record failed:", error.message);
  }
}

// Indirection so tests can swap in an in-memory store.
export const ledger = { lookup, record };
