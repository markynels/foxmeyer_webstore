#!/usr/bin/env node
// Copy Desk — bilingual FR/EN copy dashboard for the Fox Meyer store.
// Run: node server.mjs   →  http://localhost:4477
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeGit } from './lib/git.mjs';
import { loadEnv, makeShopify } from './lib/shopify.mjs';
import { makeStaged } from './lib/staged.mjs';
import { makeHistory } from './lib/history.mjs';
import { lint } from './lib/lint.mjs';
import { makeLocaleAdapter } from './lib/adapter-locale.mjs';
import { makeThemeSettingsAdapter } from './lib/adapter-theme-settings.mjs';
import { makeAdminAdapter } from './lib/adapter-admin.mjs';
import { makeEntries } from './lib/entries.mjs';
import { toCsv, toJson, toXliff } from './lib/export.mjs';
import { makeTranslator, styleExamples } from './lib/translate.mjs';

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TOOL_DIR, '..', '..');
const DATA_DIR = join(TOOL_DIR, 'data');
const PORT = 4477;

const env = loadEnv(TOOL_DIR);
const git = makeGit(REPO_ROOT);
const shopify = makeShopify(env);
const translator = makeTranslator(env);
const staged = makeStaged(DATA_DIR);
const history = makeHistory(DATA_DIR);
const localeAdapter = makeLocaleAdapter(REPO_ROOT);
const settingsAdapter = makeThemeSettingsAdapter(REPO_ROOT);
const adminAdapter = makeAdminAdapter();
const entriesSvc = makeEntries({ localeAdapter, settingsAdapter, adminAdapter, staged, git });

// ---- shopify cache -------------------------------------------------------
const CACHE_FILE = join(DATA_DIR, 'shopify-cache.json');
function readCache() {
  try { return JSON.parse(readFileSync(CACHE_FILE, 'utf8')); } catch { return null; }
}
function writeCache(obj) {
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = CACHE_FILE + '.tmp';
  writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
  renameSync(tmp, CACHE_FILE);
}

// ---- helpers -------------------------------------------------------------
async function findEntry(id) {
  const entries = await entriesSvc.list(readCache());
  return entries.find(e => e.id === id) || null;
}

function assertGitWritable(status) {
  if (status.inProgress) throw httpError(409, 'A git merge/rebase is in progress — resolve it before saving.');
  if (status.behind > 0) throw httpError(409,
    `origin/${status.branch} has ${status.behind} new commit(s) (customizer auto-commits?). Run git pull before saving theme copy.`);
}

function httpError(code, message) { const e = new Error(message); e.code = code; return e; }

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

// Shared save path for manual edits and AI batch fills: lint → git write or
// Shopify stage → history. Pass opts.gitStatus to reuse one status check
// across a batch; opts.ai marks the history event as machine-generated.
async function applyEdit(entry, lang, value, opts = {}) {
  if (lang === 'en' && entry.en.readonly) throw httpError(400, 'EN admin content is read-only in v1 — edit it in Shopify admin, then Refresh.');

  const counterpart = lang === 'en'
    ? (entry.fr.stagedValue ?? entry.fr.value)
    : (entry.en.stagedValue ?? entry.en.value);
  const issues = lint({ value, lang, counterpart, kind: entry.kind });
  if (issues.length && !opts.override) return { applied: false, issues };

  const before = lang === 'en' ? entry.en.value : (entry.fr.stagedValue ?? entry.fr.value);
  const historyExtra = opts.ai ? { ai: true } : {};

  if (entry.source === 'locale' || (entry.source === 'setting' && lang === 'en')) {
    assertGitWritable(opts.gitStatus ?? await git.status());
    if (entry.source === 'locale') {
      localeAdapter.write(entry.id.replace('locale:', ''), lang, value);
    } else {
      const [template, sectionType, settingId] = entry.id.replace('setting:', '').split('/');
      settingsAdapter.writeEn(template, sectionType, settingId, value);
    }
    history.append({ entryId: entry.id, lang, before, after: value, action: 'save-git', ...historyExtra });
    return { applied: true, mode: 'git', issues };
  }

  // Shopify-backed FR (settings + admin): stage locally
  if (!entry.fr.resourceId || !entry.fr.contentKey) {
    throw httpError(409, 'No Shopify resource known for this entry yet — hit "Refresh from Shopify" first.');
  }
  staged.set(entry.id, lang, {
    value,
    stagedAt: new Date().toISOString(),
    resourceId: entry.fr.resourceId,
    contentKey: entry.fr.contentKey,
    baseDigest: entry.en.digest ?? null,
  });
  history.append({ entryId: entry.id, lang, before, after: value, action: 'stage', ...historyExtra });
  return { applied: true, mode: 'staged', issues };
}

// ---- request handlers ----------------------------------------------------
const routes = {
  async 'GET /api/state'() {
    const cache = readCache();
    const [entries, gitStatus] = await Promise.all([entriesSvc.list(cache), git.status()]);
    return {
      entries,
      git: gitStatus,
      shopify: {
        connected: shopify.connected,
        store: shopify.store || null,
        fetchedAt: cache?.fetchedAt || null,
        missingScopes: cache?.missingScopes || [],
      },
      ai: { connected: translator.connected, model: translator.connected ? translator.model : null },
      stagedCount: Object.keys(staged.all()).length,
    };
  },

  async 'POST /api/refresh'() {
    if (!shopify.connected) throw httpError(400, 'Shopify not configured. Create tools/copy-desk/.env — see README.md.');
    const { resources, missingScopes } = await shopify.fetchAll();
    writeCache({ fetchedAt: new Date().toISOString(), resources, missingScopes });
    return { ok: true, resourceCount: resources.length, missingScopes };
  },

  async 'POST /api/git-fetch'() {
    await git.fetch();
    return await git.status();
  },

  async 'POST /api/edit'(req) {
    const { id, lang, value, override } = await readBody(req);
    if (!id || !['en', 'fr'].includes(lang) || typeof value !== 'string') throw httpError(400, 'Need id, lang (en|fr), value.');
    const entry = await findEntry(id);
    if (!entry) throw httpError(404, `Unknown entry ${id}`);
    const result = await applyEdit(entry, lang, value, { override });
    if (result.applied && result.mode === 'git') result.diffStat = await git.diffStat();
    return result;
  },

  // AI transcreation of one entry — returns a draft for the FR textarea; nothing is saved.
  async 'POST /api/translate'(req) {
    if (!translator.connected) throw httpError(400, 'AI translation not configured. Add ANTHROPIC_API_KEY to tools/copy-desk/.env.');
    const { id } = await readBody(req);
    const entries = await entriesSvc.list(readCache());
    const entry = entries.find(e => e.id === id);
    if (!entry) throw httpError(404, `Unknown entry ${id}`);
    const en = entry.en.stagedValue ?? entry.en.value;
    if (!en) throw httpError(400, 'No EN source text to translate.');

    const items = [{
      id: entry.id,
      context: `${entry.group} / ${entry.subgroup} / ${entry.label}`,
      kind: entry.kind,
      en,
      currentFr: entry.fr.stagedValue ?? entry.fr.value ?? null,
    }];
    const [result] = await translator.translate(items, styleExamples(entries, entry.group));
    if (!result?.fr) throw httpError(502, 'Model returned no translation.');
    const issues = lint({ value: result.fr, lang: 'fr', counterpart: en, kind: entry.kind });
    return { value: result.fr, issues };
  },

  // AI transcreation of every untranslated FR entry (optionally one group),
  // applied through the normal save path: git-backed values land in
  // locales/fr.json (review via git diff), Shopify-backed values are staged
  // (review before "Publish staged"). Lint findings skip the entry instead.
  async 'POST /api/translate-missing'(req) {
    if (!translator.connected) throw httpError(400, 'AI translation not configured. Add ANTHROPIC_API_KEY to tools/copy-desk/.env.');
    const { group } = await readBody(req);
    const entries = await entriesSvc.list(readCache());
    const targets = entries.filter(e =>
      (!group || e.group === group) &&
      !(e.fr.stagedValue ?? e.fr.value) &&
      (e.en.stagedValue ?? e.en.value));
    if (!targets.length) return { applied: [], flagged: [], failed: [] };

    // Fail fast if git-backed FR is involved and the repo isn't writable.
    const gitStatus = await git.status();
    if (targets.some(t => t.source === 'locale')) assertGitWritable(gitStatus);

    const items = targets.map(e => ({
      id: e.id,
      context: `${e.group} / ${e.subgroup} / ${e.label}`,
      kind: e.kind,
      en: e.en.stagedValue ?? e.en.value,
      currentFr: null,
    }));
    const results = await translator.translate(items, styleExamples(entries, group));
    const byId = new Map(results.map(r => [r.id, r.fr]));

    const applied = [], flagged = [], failed = [];
    for (const entry of targets) {
      const fr = byId.get(entry.id);
      if (typeof fr !== 'string' || !fr.trim()) {
        failed.push({ id: entry.id, error: 'model returned no translation' });
        continue;
      }
      try {
        const res = await applyEdit(entry, 'fr', fr, { ai: true, gitStatus });
        if (res.applied) applied.push({ id: entry.id, mode: res.mode });
        else flagged.push({ id: entry.id, issues: res.issues });
      } catch (e) {
        failed.push({ id: entry.id, error: e.message });
      }
    }
    return { applied, flagged, failed };
  },

  async 'POST /api/unstage'(req) {
    const { id, lang } = await readBody(req);
    staged.remove(id, lang);
    return { ok: true };
  },

  async 'POST /api/publish'() {
    if (!shopify.connected) throw httpError(400, 'Shopify not configured.');
    const all = staged.all();
    const items = Object.entries(all).filter(([k]) => k.endsWith('::fr'));
    if (!items.length) return { published: [], excluded: [] };

    // group by resource
    const byResource = {};
    for (const [key, rec] of items) {
      (byResource[rec.resourceId] ??= []).push({ key, rec });
    }

    const published = [], excluded = [];
    for (const [resourceId, group] of Object.entries(byResource)) {
      const digests = await shopify.fetchDigests(resourceId); // re-fetch at publish time
      const ok = [], stale = [];
      for (const { key, rec } of group) {
        const current = digests[rec.contentKey];
        if (!current) { stale.push({ key, reason: 'content key no longer exists' }); continue; }
        if (rec.baseDigest && current.digest !== rec.baseDigest) {
          stale.push({ key, reason: 'EN source changed since staging (digest mismatch)' });
          continue;
        }
        ok.push({ key, rec, digest: current.digest });
      }
      if (ok.length) {
        await shopify.registerTranslations(resourceId, ok.map(o => ({
          key: o.rec.contentKey, value: o.rec.value, digest: o.digest,
        })));
        for (const o of ok) {
          const entryId = o.key.replace(/::fr$/, '');
          history.append({ entryId, lang: 'fr', before: null, after: o.rec.value, action: 'publish' });
          staged.remove(entryId, 'fr');
          published.push(entryId);
        }
      }
      for (const s of stale) excluded.push({ entryId: s.key.replace(/::fr$/, ''), reason: s.reason });
    }
    return { published, excluded };
  },

  async 'GET /api/history'(req, url) {
    return history.forEntry(url.searchParams.get('id'));
  },

  async 'GET /api/export/csv'() {
    const entries = await entriesSvc.list(readCache());
    return { _raw: toCsv(entries), type: 'text/csv; charset=utf-8', filename: 'fox-meyer-copy.csv' };
  },
  async 'GET /api/export/json'() {
    const entries = await entriesSvc.list(readCache());
    return { _raw: toJson(entries), type: 'application/json', filename: 'fox-meyer-copy.json' };
  },
  async 'GET /api/export/xliff'() {
    const entries = await entriesSvc.list(readCache());
    return { _raw: toXliff(entries), type: 'application/xml', filename: 'fox-meyer-fr.xliff' };
  },
};

// ---- static + server -----------------------------------------------------
const STATIC = { '/': 'index.html', '/app.mjs': 'app.mjs', '/style.css': 'style.css' };
const MIME = { html: 'text/html; charset=utf-8', mjs: 'text/javascript', css: 'text/css' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    const handler = routes[`${req.method} ${url.pathname}`];
    if (handler) {
      const result = await handler(req, url);
      if (result?._raw !== undefined) {
        res.writeHead(200, {
          'Content-Type': result.type,
          'Content-Disposition': `attachment; filename="${result.filename}"`,
        });
        res.end(result._raw);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      }
      return;
    }
    const file = STATIC[url.pathname];
    if (file && existsSync(join(TOOL_DIR, 'public', file))) {
      res.writeHead(200, { 'Content-Type': MIME[file.split('.').at(-1)] });
      res.end(readFileSync(join(TOOL_DIR, 'public', file)));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (e) {
    res.writeHead(e.code && e.code >= 400 && e.code < 600 ? e.code : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Copy Desk → http://localhost:${PORT}`);
  console.log(`Repo: ${REPO_ROOT}`);
  console.log(shopify.connected
    ? `Shopify: ${shopify.store} (API ${shopify.version})`
    : 'Shopify: not configured (git-only mode) — see README.md to connect.');
  console.log(translator.connected
    ? `AI transcreation: ${translator.model}`
    : 'AI transcreation: not configured — add ANTHROPIC_API_KEY to .env to enable FR drafts.');
});
