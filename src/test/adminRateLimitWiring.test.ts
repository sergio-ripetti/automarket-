import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Regression test for the admin-navigation 429 bug: every authenticated admin/demo route in
// server.js used to share ONE 20-req/60s bucket (`rateLimiter`/`rateLimit`) with the public,
// abuse-sensitive endpoints. Ordinary navigation (Dashboard mount alone fires 3+ concurrent
// authenticated requests, plus AdminLayout's 30s messages/financing poll, plus GET /api/me on
// every page mount) exhausted that budget within a couple of page visits, surfacing as
// intermittent "Failed to fetch sales/messages"/"Failed to load financing requests" errors that
// a hard refresh often appeared to "fix" (the window had aged out by the time the page reloaded).
//
// The fix splits the bucket: authenticated admin/demo routes now use a separate, more generous
// `adminRateLimit` (keyed by uid), while the three public/unauthenticated endpoints keep the
// original tighter `rateLimit` (keyed by IP, the only signal available for anonymous traffic).
//
// server.js isn't structured as an importable/testable module (it self-executes app.listen() and
// requires live Anthropic/Firebase env at import time), so this test asserts the route-wiring
// invariant directly against the source rather than boot the whole server - this is enough to
// catch a regression where an authenticated route is put back on the shared public bucket, or a
// public route is accidentally moved onto the per-uid bucket it has no uid for.
describe('server.js - admin vs public rate-limit bucket wiring', () => {
  let source: string;

  beforeAll(() => {
    const here = dirname(fileURLToPath(import.meta.url));
    const serverPath = resolve(here, '../../server.js');
    source = readFileSync(serverPath, 'utf-8');
  });

  it('defines a separate adminRateLimiter with a higher budget than the public rateLimiter', () => {
    const publicMatch = source.match(/const rateLimiter = new RateLimiter\((\d+),\s*(\d+)\)/);
    const adminMatch = source.match(/const adminRateLimiter = new RateLimiter\((\d+),\s*(\d+)\)/);
    expect(publicMatch, 'public rateLimiter definition not found').not.toBeNull();
    expect(adminMatch, 'adminRateLimiter definition not found').not.toBeNull();

    const publicMax = Number(publicMatch![2]);
    const adminMax = Number(adminMatch![2]);
    expect(adminMax).toBeGreaterThan(publicMax);
  });

  it('keys the public rate limiter by IP only (no per-uid bucket for anonymous routes)', () => {
    const bodyMatch = source.match(/const rateLimit = \(req, res, next\) => \{([\s\S]*?)\n\};/);
    expect(bodyMatch, 'rateLimit middleware body not found').not.toBeNull();
    expect(bodyMatch![1]).toMatch(/req\.ip/);
    expect(bodyMatch![1]).not.toMatch(/req\.user/);
  });

  it('keys the admin rate limiter by the authenticated uid and returns Retry-After on 429', () => {
    const bodyMatch = source.match(/const adminRateLimit = \(req, res, next\) => \{([\s\S]*?)\n\};/);
    expect(bodyMatch, 'adminRateLimit middleware body not found').not.toBeNull();
    const body = bodyMatch![1];
    expect(body).toMatch(/req\.user\.uid/);
    expect(body).toMatch(/Retry-After/);
    expect(body).toMatch(/429/);
  });

  it('every authenticate-gated route uses adminRateLimit, never the public rateLimit', () => {
    const routeLines = source
      .split('\n')
      .filter((line) => /^app\.(get|post|patch|put|delete)\(/.test(line.trim()));

    // GET /api/me has never carried any rate-limit middleware (pre-existing, out of scope for
    // this fix), and POST /api/aiAssistant intentionally keeps its own pre-existing isolated
    // `aiRateLimiter` bucket (see the comment above that route in server.js) - both excluded here
    // rather than papering over them with an unrelated change.
    const authenticatedRoutes = routeLines.filter(
      (line) =>
        line.includes('authenticate') &&
        !line.includes("'/api/me'") &&
        !line.includes("'/api/aiAssistant'"),
    );
    expect(authenticatedRoutes.length).toBeGreaterThan(0);

    for (const line of authenticatedRoutes) {
      expect(line, `expected adminRateLimit on authenticated route: ${line.trim()}`).toMatch(/adminRateLimit/);
      // A bare ", rateLimit," (not "adminRateLimit") would mean this route regressed onto the
      // shared public bucket.
      expect(line).not.toMatch(/[^a-zA-Z]rateLimit,/);
    }
  });

  it('POST /api/aiAssistant keeps its own isolated aiRateLimit bucket', () => {
    expect(source).toContain(
      "app.post('/api/aiAssistant', authenticate, requireAdminOrDemo, aiRateLimit,",
    );
  });

  it('the three public/unauthenticated routes use the public rateLimit, not adminRateLimit', () => {
    const publicRoutePaths = [
      "app.get('/api/public/sold-vehicle-ids', rateLimit,",
      "app.post('/api/financing/submit', rateLimit,",
      "app.post('/api/messages/submit', rateLimit,",
    ];
    for (const snippet of publicRoutePaths) {
      expect(source, `expected to find: ${snippet}`).toContain(snippet);
    }
  });
});
