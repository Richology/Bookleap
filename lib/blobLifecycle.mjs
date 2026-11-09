// A one-hour gap exceeds the production parser's hard 300-second lifetime.
export const BLOB_PARSE_MAX_AGE_MS = 23 * 60 * 60 * 1000;
export const BLOB_ARCHIVE_MIN_AGE_MS = 24 * 60 * 60 * 1000;
export const BLOB_LIFECYCLE_VERSION = 1;

export function blobAge(uploadedAt, now = Date.now()) {
  return now - new Date(uploadedAt).getTime();
}

export function canParseBlob(uploadedAt, now = Date.now()) {
  const age = blobAge(uploadedAt, now);
  return Number.isFinite(age) && age >= 0 && age < BLOB_PARSE_MAX_AGE_MS;
}

export function canArchiveBlob(uploadedAt, now = Date.now()) {
  const age = blobAge(uploadedAt, now);
  return Number.isFinite(age) && age >= BLOB_ARCHIVE_MIN_AGE_MS;
}

export function ownedBlobUrl(value, token) {
  const store = /^vercel_blob_rw_([a-zA-Z0-9]+)_/.exec(token || '')?.[1];
  if (!store || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== `${store.toLowerCase()}.public.blob.vercel-storage.com` ||
        url.port || url.username || url.password || url.search || url.hash) return null;
    return url.href;
  } catch { return null; }
}
