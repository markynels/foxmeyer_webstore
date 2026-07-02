// Assembles the unified CopyEntry list: adapters + staged overlay + status derivation.
// Statuses: untranslated | dirty (git change uncommitted) | staged | source-outdated | published | ok

function flatten(obj, prefix = []) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (typeof v === 'string') out[[...prefix, k].join('.')] = v;
    else if (v && typeof v === 'object') Object.assign(out, flatten(v, [...prefix, k]));
  }
  return out;
}

function stripBanner(raw) {
  const m = raw.match(/^(\s*\/\*[\s\S]*?\*\/\s*\n)/);
  return m ? raw.slice(m[1].length) : raw;
}

export function makeEntries({ localeAdapter, settingsAdapter, adminAdapter, staged, git }) {
  // Values at HEAD for the git-backed files, so we can mark uncommitted edits "dirty".
  async function headValues() {
    const head = { locale: { en: {}, fr: {} }, settings: {} };
    for (const lang of ['en', 'fr']) {
      const raw = await git.showHead(localeAdapter.files[lang]);
      if (raw) head.locale[lang] = flatten(JSON.parse(raw).fms);
    }
    for (const t of settingsAdapter.templates) {
      const raw = await git.showHead(t.file);
      if (!raw) continue;
      const data = JSON.parse(stripBanner(raw));
      for (const section of Object.values(data.sections || {})) {
        for (const [id, v] of Object.entries(section.settings || {})) {
          if (typeof v === 'string') head.settings[`${t.template}/${section.type}/${id}`] = v;
        }
      }
    }
    return head;
  }

  return {
    async list(cache) {
      const head = await headValues();
      const stagedAll = staged.all();
      const entries = [
        ...localeAdapter.list(),
        ...settingsAdapter.list(cache),
        ...adminAdapter.list(cache),
      ];

      for (const e of entries) {
        // staged overlay (Shopify-backed values only)
        for (const lang of ['en', 'fr']) {
          const s = stagedAll[`${e.id}::${lang}`];
          if (s) { e[lang].stagedValue = s.value; e[lang].stagedAt = s.stagedAt; }
        }

        const frValue = e.fr.stagedValue ?? e.fr.value;
        const statuses = [];
        if (!frValue) statuses.push('untranslated');
        if (e.fr.stagedValue !== undefined || e.en.stagedValue !== undefined) statuses.push('staged');
        if (e.fr.outdated) statuses.push('source-outdated');

        // dirty = git-backed value differs from HEAD
        if (e.source === 'locale') {
          const key = e.id.replace('locale:fms.', '');
          if (head.locale.en[key] !== undefined && head.locale.en[key] !== e.en.value) statuses.push('dirty');
          if ((head.locale.fr[key] ?? null) !== e.fr.value) statuses.push('dirty');
        } else if (e.source === 'setting') {
          const key = e.id.replace('setting:', '');
          const headVal = head.settings[key];
          // undefined at HEAD + savedInTemplate=false means schema default — not dirty
          if (e.en.savedInTemplate && headVal !== e.en.value) statuses.push('dirty');
        }

        e.status = statuses.length ? [...new Set(statuses)] : ['ok'];
      }
      return entries;
    },
  };
}
