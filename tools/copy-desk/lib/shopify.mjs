// Minimal Shopify Admin GraphQL client. Token from tools/copy-desk/.env:
//   SHOPIFY_STORE=fox-meyer.myshopify.com
//   SHOPIFY_ADMIN_TOKEN=shpat_...
//   SHOPIFY_API_VERSION=2026-01   (optional)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadEnv(toolDir) {
  const env = {};
  try {
    for (const line of readFileSync(join(toolDir, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch { /* no .env — git-only mode */ }
  return env;
}

export function makeShopify(env) {
  const store = env.SHOPIFY_STORE;
  const token = env.SHOPIFY_ADMIN_TOKEN;
  const version = env.SHOPIFY_API_VERSION || '2026-01';
  const connected = Boolean(store && token);

  async function graphql(query, variables = {}) {
    if (!connected) throw new Error('Shopify not configured — set SHOPIFY_STORE and SHOPIFY_ADMIN_TOKEN in tools/copy-desk/.env');
    const res = await fetch(`https://${store}/admin/api/${version}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 2000));
      return graphql(query, variables);
    }
    const body = await res.json();
    if (body.errors) throw new Error('GraphQL: ' + JSON.stringify(body.errors));
    const throttle = body.extensions?.cost?.throttleStatus;
    if (throttle && throttle.currentlyAvailable < throttle.maximumAvailable * 0.2) {
      await new Promise(r => setTimeout(r, 1500)); // let the bucket refill before the next call
    }
    return body.data;
  }

  const RESOURCE_TYPES = [
    'PRODUCT', 'ONLINE_STORE_PAGE', 'SHOP_POLICY', 'SHOP',
    'ONLINE_STORE_THEME_JSON_TEMPLATE', 'ONLINE_STORE_THEME_SETTINGS_DATA_SECTIONS',
  ];

  const TRANSLATABLE_QUERY = `
    query ($type: TranslatableResourceType!, $first: Int!, $after: String) {
      translatableResources(resourceType: $type, first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges { node {
          resourceId
          translatableContent { key value digest locale }
          translations(locale: "fr") { key value outdated }
        } }
      }
    }`;

  return {
    connected,
    store,
    version,
    graphql,

    // Fetch every translatable resource we care about. Returns { resources, missingScopes }.
    async fetchAll() {
      const resources = [];
      const missingScopes = [];
      for (const type of RESOURCE_TYPES) {
        try {
          let after = null;
          do {
            const data = await graphql(TRANSLATABLE_QUERY, { type, first: 50, after });
            const page = data.translatableResources;
            for (const { node } of page.edges) {
              resources.push({
                resourceType: type,
                resourceId: node.resourceId,
                content: node.translatableContent,
                fr: node.translations,
              });
            }
            after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
          } while (after);
        } catch (e) {
          missingScopes.push({ type, error: String(e.message || e).slice(0, 300) });
        }
      }
      return { resources, missingScopes };
    },

    // Current digests for one resource, keyed by content key.
    async fetchDigests(resourceId) {
      const data = await graphql(`
        query ($id: ID!) {
          translatableResource(resourceId: $id) {
            translatableContent { key value digest }
          }
        }`, { id: resourceId });
      const map = {};
      for (const c of data.translatableResource?.translatableContent || []) map[c.key] = c;
      return map;
    },

    // Register FR translations on one resource. items: [{key, value, digest}]
    async registerTranslations(resourceId, items) {
      const data = await graphql(`
        mutation ($id: ID!, $translations: [TranslationInput!]!) {
          translationsRegister(resourceId: $id, translations: $translations) {
            translations { key value }
            userErrors { field message }
          }
        }`, {
        id: resourceId,
        translations: items.map(i => ({
          key: i.key, locale: 'fr', value: i.value, translatableContentDigest: i.digest,
        })),
      });
      const errs = data.translationsRegister.userErrors;
      if (errs?.length) throw new Error('translationsRegister: ' + JSON.stringify(errs));
      return data.translationsRegister.translations;
    },
  };
}
