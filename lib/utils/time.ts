export const DEFAULT_RETENTION_DAYS = 7;

export function nowIso() {
  return new Date().toISOString();
}

export function addSecondsToIso(seconds: number, from = Date.now()) {
  return new Date(from + seconds * 1000).toISOString();
}

export function isExpired(expiresAt: string, now = Date.now()) {
  return new Date(expiresAt).getTime() <= now;
}

export function getRetentionDays() {
  const raw = process.env.CACHE_TTL_DAYS?.trim();
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
}

export function getRetentionSeconds() {
  return getRetentionDays() * 24 * 60 * 60;
}
