// Section-settings adapter.
// EN lives in templates/*.json (git). FR lives only in Shopify as theme translations
// (ONLINE_STORE_THEME_JSON_TEMPLATE resources) — read from the shopify cache, written
// via staging + translationsRegister.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseOrdered, stringifyOrdered } from './json-ordered.mjs';

const TEMPLATES = [
  { template: 'index', file: 'templates/index.json', group: 'Homepage' },
  { template: 'page.shop', file: 'templates/page.shop.json', group: 'Shop page' },
  { template: 'page.about', file: 'templates/page.about.json', group: 'About page' },
  { template: 'product', file: 'templates/product.json', group: 'Product page' },
];

const TEXT_TYPES = new Set(['text', 'textarea', 'richtext', 'inline_richtext', 'html']);

// Template JSONs carry an auto-generated /* ... */ banner before the JSON body.
// Preserve it byte-identically on write.
function splitBanner(raw) {
  const m = raw.match(/^(\s*\/\*[\s\S]*?\*\/\s*\n)/);
  return m ? { banner: m[1], json: raw.slice(m[1].length) } : { banner: '', json: raw };
}

function parseSchema(repoRoot, sectionType) {
  const raw = readFileSync(join(repoRoot, `sections/${sectionType}.liquid`), 'utf8');
  const m = raw.match(/{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/);
  if (!m) throw new Error(`No {% schema %} in sections/${sectionType}.liquid`);
  return JSON.parse(m[1]);
}

export function makeThemeSettingsAdapter(repoRoot) {
  function readTemplate(file) {
    const raw = readFileSync(join(repoRoot, file), 'utf8');
    const { banner, json } = splitBanner(raw);
    return { banner, data: JSON.parse(json) };
  }

  // Find the FR value + digest for one setting in the cached Shopify resources.
  // Theme JSON-template content keys look like "sections.<sectionKey>.settings.<settingId>".
  function findShopify(cache, sectionKey, settingId) {
    const suffix = `.${sectionKey}.settings.${settingId}`;
    for (const res of cache?.resources || []) {
      if (!res.resourceType.startsWith('ONLINE_STORE_THEME')) continue;
      const content = res.content.find(c => c.key.endsWith(suffix));
      if (content) {
        const fr = res.fr.find(t => t.key === content.key);
        return { resourceId: res.resourceId, key: content.key, digest: content.digest, fr };
      }
    }
    return null;
  }

  return {
    templates: TEMPLATES,

    list(cache) {
      const entries = [];
      for (const t of TEMPLATES) {
        const { data } = readTemplate(t.file);
        for (const [sectionKey, section] of Object.entries(data.sections || {})) {
          if (!section.type?.startsWith('fox-meyer-')) continue;
          const schema = parseSchema(repoRoot, section.type);
          let subgroup = 'General';
          for (const s of schema.settings || []) {
            if (s.type === 'header') { subgroup = s.content; continue; }
            if (!TEXT_TYPES.has(s.type) || !s.id) continue;
            const saved = section.settings?.[s.id];
            const enValue = saved !== undefined ? saved : (s.default ?? '');
            if (typeof enValue !== 'string') continue;
            const shopify = findShopify(cache, sectionKey, s.id);
            entries.push({
              id: `setting:${t.template}/${section.type}/${s.id}`,
              source: 'setting',
              group: t.group,
              subgroup,
              label: s.label || s.id,
              kind: s.id.endsWith('_html') || s.type === 'richtext' ? 'html' : (s.type === 'textarea' ? 'textarea' : 'text'),
              en: {
                value: enValue,
                origin: 'git',
                file: t.file,
                savedInTemplate: saved !== undefined,
                digest: shopify?.digest ?? null,
              },
              fr: {
                value: shopify?.fr?.value ?? null,
                origin: 'shopify',
                outdated: shopify?.fr?.outdated ?? false,
                resourceId: shopify?.resourceId ?? null,
                contentKey: shopify?.key ?? null,
              },
            });
          }
        }
      }
      return entries;
    },

    // Write an EN value into its template JSON, preserving the banner.
    writeEn(template, sectionType, settingId, value) {
      const t = TEMPLATES.find(x => x.template === template);
      if (!t) throw new Error(`Unknown template ${template}`);
      const filePath = join(repoRoot, t.file);
      const raw = readFileSync(filePath, 'utf8');
      const { banner, json } = splitBanner(raw);
      const data = parseOrdered(json);
      const sectionKey = Object.keys(data.sections).find(k => data.sections[k].type === sectionType);
      if (!sectionKey) throw new Error(`Section ${sectionType} not found in ${t.file}`);
      data.sections[sectionKey].settings ??= {};
      data.sections[sectionKey].settings[settingId] = value;
      writeFileSync(filePath, banner + stringifyOrdered(data) + '\n');
    },
  };
}
