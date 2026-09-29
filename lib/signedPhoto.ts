import { getAdmin } from './supabaseAdmin';

// ─── Signed photo URLs ──────────────────────────────────────────────────────────
// player-photos and coach-photos are PRIVATE buckets — children's and staff
// images must not be readable by URL to the whole internet. So instead of a
// permanent public URL, we generate a short-lived signed URL each time a photo
// is served, and only for a request that has already passed the caller's
// authorization checks.
//
// A signed URL is valid for one hour, which is long enough for a page session
// and short enough that a leaked link expires quickly. The path — not a URL —
// is what we persist, so re-signing is always possible.

const PHOTO_TTL_SECONDS = 60 * 60;

/**
 * Turn a stored storage path into a temporary signed URL. Returns null if
 * there's no path or signing fails — callers render a placeholder in that
 * case rather than a broken image.
 */
export async function signPhoto(bucket: 'player-photos' | 'coach-photos', path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    const { data, error } = await getAdmin().storage.from(bucket).createSignedUrl(path, PHOTO_TTL_SECONDS);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Sign many at once (e.g. a squad list). Preserves order; missing paths become
 * null. One round-trip per photo, so keep the list to a screen's worth.
 */
export async function signPhotos(
  bucket: 'player-photos' | 'coach-photos',
  paths: (string | null)[]
): Promise<(string | null)[]> {
  return Promise.all(paths.map(p => signPhoto(bucket, p)));
}

/**
 * Extract the storage path from a legacy public URL, so existing rows that
 * stored the full public URL keep working during the transition. A public URL
 * looks like .../storage/v1/object/public/player-photos/<path>; we want <path>.
 */
export function pathFromLegacyUrl(url: string | null, bucket: string): string | null {
  if (!url) return null;
  const marker = `/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length);
}
