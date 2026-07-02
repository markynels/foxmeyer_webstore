// Locale-file adapter — the `fms` namespace in locales/en.default.json + locales/fr.json.
// Both files are git-tracked; writes go straight to disk (git diff is the review step).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseOrdered, stringifyOrdered } from './json-ordered.mjs';

const FILES = { en: 'locales/en.default.json', fr: 'locales/fr.json' };

// Human grouping of fms.* second-level namespaces
const SUBGROUP_LABELS = {
  header: 'Header', footer: 'Footer', shop: 'Box builder', product: 'Product page',
  redirect: 'Redirect page', meta: 'Meta / SEO', breadcrumb: 'Breadcrumbs', cart: 'Cart drawer',
};

function flatten(obj, prefix = []) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (typeof v === 'string') out[[...prefix, k].join('.')] = v;
    else if (v && typeof v === 'object') Object.assign(out, flatten(v, [...prefix, k]));
  }
  return out;
}

export function makeLocaleAdapter(repoRoot) {
  function readFile(lang) {
    return JSON.parse(readFileSync(join(repoRoot, FILES[lang]), 'utf8'));
  }

  return {
    files: FILES,

    // -> CopyEntry[] (en/fr values only; status derived later)
    list() {
      const en = flatten(readFile('en').fms);
      const fr = flatten(readFile('fr').fms);
      return Object.entries(en).map(([key, enValue]) => {
        const ns = key.split('.')[0];
        return {
          id: `locale:fms.${key}`,
          source: 'locale',
          group: 'Theme strings',
          subgroup: SUBGROUP_LABELS[ns] || ns,
          label: key,
          kind: key.endsWith('_html') ? 'html' : 'text',
          en: { value: enValue, origin: 'git', file: FILES.en },
          fr: { value: fr[key] ?? null, origin: 'git', file: FILES.fr },
        };
      });
    },

    // Write one value. keyPath like "fms.cart.checkout".
    write(keyPath, lang, value) {
      const filePath = join(repoRoot, FILES[lang]);
      const data = parseOrdered(readFileSync(filePath, 'utf8'));
      const parts = keyPath.split('.');
      let node = data;
      for (const p of parts.slice(0, -1)) node = node[p] ?? (node[p] = {});
      node[parts.at(-1)] = value;
      writeFileSync(filePath, stringifyOrdered(data) + '\n');
    },
  };
}
