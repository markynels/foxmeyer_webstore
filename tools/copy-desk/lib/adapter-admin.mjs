// Admin-content adapter — products, pages, policies, shop meta.
// Both languages live only in Shopify. EN is read-only in v1 (edit in admin);
// FR is staged locally and published via translationsRegister.

const TYPE_META = {
  PRODUCT: { group: 'Products', labelKey: 'title' },
  ONLINE_STORE_PAGE: { group: 'Pages & Policies', labelKey: 'title' },
  SHOP_POLICY: { group: 'Pages & Policies', labelKey: null },
  SHOP: { group: 'Meta / SEO', labelKey: null },
};

const KEY_LABELS = {
  title: 'Title', body_html: 'Description / body', body: 'Body',
  handle: 'Handle', meta_title: 'SEO title', meta_description: 'SEO description',
};

// Keys we surface (skip handles — changing them breaks URLs, not a copy concern)
const SKIP_KEYS = new Set(['handle']);

export function makeAdminAdapter() {
  return {
    list(cache) {
      const entries = [];
      for (const res of cache?.resources || []) {
        const meta = TYPE_META[res.resourceType];
        if (!meta) continue;
        const resourceLabel =
          (meta.labelKey && res.content.find(c => c.key === meta.labelKey)?.value) ||
          res.resourceId.split('/').slice(-2).join(' ');
        for (const c of res.content) {
          if (SKIP_KEYS.has(c.key)) continue;
          if (typeof c.value !== 'string' || c.value === '') continue;
          const fr = res.fr.find(t => t.key === c.key);
          entries.push({
            id: `admin:${res.resourceId}/${c.key}`,
            source: 'admin',
            group: meta.group,
            subgroup: resourceLabel,
            label: KEY_LABELS[c.key] || c.key,
            kind: c.key.endsWith('_html') || c.key === 'body' ? 'html' : 'text',
            en: { value: c.value, origin: 'shopify', digest: c.digest, readonly: true },
            fr: {
              value: fr?.value ?? null,
              origin: 'shopify',
              outdated: fr?.outdated ?? false,
              resourceId: res.resourceId,
              contentKey: c.key,
            },
          });
        }
      }
      return entries;
    },
  };
}
