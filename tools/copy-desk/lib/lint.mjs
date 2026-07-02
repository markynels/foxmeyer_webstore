// Copy lint: brand rules + placeholder/tag parity between languages.
// Rules are data so new ones are one line, not new code.

const BRAND_RULES = [
  {
    id: 'fox-blend', severity: 'error', langs: ['en', 'fr'],
    test: v => /fox\s*blend/i.test(v),
    message: '"Fox Blend" is internal-only and must never appear in consumer-facing copy.',
  },
  {
    id: 'fr-registered-mark', severity: 'warning', langs: ['fr'],
    test: v => v.includes('®'),
    message: 'French/Quebec surfaces should use "Fox Meyer ᴹᴰ", not "®".',
  },
  {
    id: 'en-md-mark', severity: 'warning', langs: ['en'],
    test: v => v.includes('ᴹᴰ'),
    message: 'English surfaces should use "Fox Meyer®", not "ᴹᴰ".',
  },
];

export function liquidTokens(v) {
  return [...(v || '').matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(m => m[1]).sort();
}
export function jsTokens(v) {
  // single-brace {name} interpolated by fox-meyer-store.js; exclude Liquid double braces
  return [...(v || '').matchAll(/(?<!\{)\{([a-z_]+)\}(?!\})/g)].map(m => m[1]).sort();
}
export function htmlTags(v) {
  return [...(v || '').matchAll(/<([a-z][\w-]*)(?:\s[^>]*)?>/gi)].map(m => m[1].toLowerCase()).sort();
}

function setDiff(a, b) {
  const missing = a.filter(x => !b.includes(x));
  const extra = b.filter(x => !a.includes(x));
  return { missing, extra };
}

// value: the edited text; lang: 'en'|'fr'; counterpart: the other language's current value (or null).
// kind: entry kind ('html' triggers tag parity). Returns [{severity, message}].
export function lint({ value, lang, counterpart, kind }) {
  const issues = [];
  for (const rule of BRAND_RULES) {
    if (rule.langs.includes(lang) && rule.test(value)) {
      issues.push({ severity: rule.severity, rule: rule.id, message: rule.message });
    }
  }
  if (counterpart) {
    for (const [name, extract] of [['Liquid {{ }}', liquidTokens], ['JS { }', jsTokens]]) {
      const { missing, extra } = setDiff(extract(counterpart), extract(value));
      if (missing.length || extra.length) {
        issues.push({
          severity: 'error', rule: 'placeholder-parity',
          message: `${name} placeholders differ from the other language` +
            (missing.length ? ` — missing: ${missing.join(', ')}` : '') +
            (extra.length ? ` — unexpected: ${extra.join(', ')}` : ''),
        });
      }
    }
    if (kind === 'html') {
      const { missing, extra } = setDiff(htmlTags(counterpart), htmlTags(value));
      if (missing.length || extra.length) {
        issues.push({
          severity: 'error', rule: 'html-tag-parity',
          message: 'HTML tags differ from the other language' +
            (missing.length ? ` — missing: <${missing.join('>, <')}>` : '') +
            (extra.length ? ` — unexpected: <${extra.join('>, <')}>` : ''),
        });
      }
    }
  }
  return issues;
}
