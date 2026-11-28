import { contentSnapshotSchema } from "../shared/src/content.ts";

const apiValue = process.env.EXPO_PUBLIC_API_URL?.trim();
const configuredOrigin = process.argv.find((arg) => arg.startsWith("--origin="))?.slice(9);
const frontendValue = configuredOrigin ?? process.env.EXPO_PUBLIC_SUPPORT_URL;

async function main() {
  if (!apiValue) throw new Error("Set EXPO_PUBLIC_API_URL before checking the connection.");
  const api = new URL(apiValue);
  if (!['http:', 'https:'].includes(api.protocol) || api.username || api.password)
    throw new Error("The API URL must be HTTP(S) and contain no credentials.");
  const base = api.href.replace(/\/+$/, "");
  const origin = frontendValue ? new URL(frontendValue).origin : undefined;
  const headers = origin ? { Origin: origin } : {};
  async function request(path, options = {}) {
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
      signal: AbortSignal.timeout(20000),
    });
    if (origin && response.headers.get("access-control-allow-origin") !== origin)
      throw new Error(`CORS does not allow ${origin}. Add this exact origin to backend CORS_ORIGINS and redeploy.`);
    return response;
  }
  const live = await request('/live');
  if (!live.ok) throw new Error(`API is unavailable (HTTP ${live.status}).`);
  console.log('API reachable.');
  const ready = await request('/ready');
  if (!ready.ok)
    throw new Error(`Database readiness failed (HTTP ${ready.status}). Install allexi_backend/supabase/setup.sql in the Supabase SQL Editor for a new schema, or apply missing migrations for an existing installation.`);
  console.log('Database readiness passed.');
  const content = await request('/v1/content');
  if (!content.ok) throw new Error(`Published scripture is unavailable (HTTP ${content.status}).`);
  const parsed = contentSnapshotSchema.parse(await content.json());
  if (!parsed.configured) throw new Error('API returned bundled fallback content rather than connected database content.');
  console.log(`Published content verified: ${parsed.verses.length} verses; default edition ${parsed.defaultEdition}; revision ${parsed.revision}.`);
  const etag = content.headers.get('etag');
  if (etag) {
    const cached = await request('/v1/content', { headers: { 'If-None-Match': etag } });
    if (cached.status !== 304) throw new Error('Published content cache validation did not return HTTP 304.');
    console.log('Content revision cache verified.');
  }
  if (origin) {
    const preflight = await request('/v1/admin/access', {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });
    const allowed = preflight.headers.get('access-control-allow-headers')?.toLowerCase() ?? '';
    if (!preflight.ok || !allowed.includes('authorization') || !allowed.includes('content-type'))
      throw new Error('The backend does not allow browser admin request headers.');
    console.log('Browser CORS and authorization preflight verified.');
  }
  const admin = await request('/v1/admin/access');
  if (admin.status !== 401) throw new Error(`Anonymous editorial access must return HTTP 401 (received ${admin.status}).`);
  console.log('Anonymous editorial access is blocked. Frontend/API connection checks passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Connection check failed.');
  process.exitCode = 1;
});
