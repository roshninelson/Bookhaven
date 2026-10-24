import { createClient } from '@supabase/supabase-js';

/**
 * Normalizes and validates a Supabase project base URL.
 * Automatically strips trailing slashes and common accidental suffixes like '/rest/v1'.
 */
export function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let clean = rawUrl.trim().replace(/^["']|["']$/g, '');
  if (!clean) return null;

  // Strip trailing slashes and accidental /rest/v1 path segments
  clean = clean.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');

  try {
    const parsed = new URL(clean);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn(`[DB Warning] SUPABASE_URL has invalid protocol: ${parsed.protocol}`);
      return null;
    }
    // Return protocol + host (and any legitimate base pathname if non-standard)
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    console.warn('[DB Warning] Malformed SUPABASE_URL provided; could not parse URL');
    return null;
  }
}

const rawUrl = process.env.SUPABASE_URL;
const normalizedUrl = normalizeSupabaseUrl(rawUrl);
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

let supabase = null;
if (normalizedUrl && key) {
  supabase = createClient(normalizedUrl, key, {
    auth: { persistSession: false },
  });
  const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service-role' : 'anon';
  let host = 'remote';
  try { host = new URL(normalizedUrl).host; } catch {}
  console.log(`[DB] Supabase client initialized (${keyType}) for host: ${host}`);
} else {
  console.log('[DB] No Supabase credentials — using in-memory store');
}

export function getSupabase() {
  return supabase;
}

export function setSupabase(client) {
  supabase = client;
}

