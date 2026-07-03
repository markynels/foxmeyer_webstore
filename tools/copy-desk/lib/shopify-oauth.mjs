// One-time Shopify OAuth over localhost — mints an Admin API access token from a
// dev-dashboard (custom-distribution) app without a tunnel or hosted URL.
// The redirect lands back on this same localhost server; the token is exchanged
// server-side and written to .env as SHOPIFY_ADMIN_TOKEN.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Scopes Copy Desk needs to read all copy and publish FR translations.
export const OAUTH_SCOPES = [
  'read_translations', 'write_translations',
  'read_products', 'read_content',
  'read_online_store_pages', 'read_themes',
  'write_legal_policies',
];

export function makeShopifyOAuth({ store, apiKey, apiSecret, redirectUri }) {
  const configured = Boolean(store && apiKey && apiSecret);
  let pendingState = null;

  return {
    configured,
    redirectUri,

    authorizeUrl() {
      pendingState = randomBytes(16).toString('hex');
      const p = new URLSearchParams({
        client_id: apiKey,
        scope: OAUTH_SCOPES.join(','),
        redirect_uri: redirectUri,
        state: pendingState,
      });
      return `https://${store}/admin/oauth/authorize?${p.toString()}`;
    },

    // rawQuery: the callback's raw query string (url.search, incl. leading "?").
    // Verifies state + shop + Shopify's HMAC signature over the exact bytes sent.
    verify(rawQuery) {
      const pairs = rawQuery.replace(/^\?/, '').split('&').map(p => {
        const i = p.indexOf('=');
        return [p.slice(0, i), p.slice(i + 1)];
      });
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));

      if (!pendingState || map.state !== pendingState) throw new Error('OAuth state mismatch — start again from "Connect Shopify".');
      if (decodeURIComponent(map.shop || '') !== store) throw new Error(`Callback shop (${map.shop}) does not match ${store}.`);

      const msg = pairs
        .filter(([k]) => k !== 'hmac' && k !== 'signature')
        .map(([k, v]) => `${k}=${v}`)
        .sort()
        .join('&');
      const digest = createHmac('sha256', apiSecret).update(msg).digest('hex');
      const a = Buffer.from(digest), b = Buffer.from(map.hmac || '');
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('OAuth HMAC verification failed — check SHOPIFY_API_SECRET.');

      pendingState = null;
      return decodeURIComponent(map.code);
    },

    async exchange(code) {
      const res = await fetch(`https://${store}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: apiKey, client_secret: apiSecret, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.access_token) {
        throw new Error(`Token exchange failed (${res.status}): ${JSON.stringify(data).slice(0, 300)}`);
      }
      return data.access_token; // shpat_... — usable as X-Shopify-Access-Token
    },
  };
}
