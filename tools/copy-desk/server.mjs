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

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TOOL_DIR, '..', '..');
const DATA_DIR = join(TOOL_DIR, 'data');
const PORT = 4477;

const git = makeGit(REPO_ROOT);
const shopify = makeShopify(loadEnv(TOOL_DIR));
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
    if (lang === 'en' && entry.en.readonly) throw httpError(400, 'EN admin content is read-only in v1 — edit it in Shopify admin, then Refresh.');

    const counterpart = lang === 'en'
      ? (entry.fr.stagedValue ?? entry.fr.value)
      : (entry.en.stagedValue ?? entry.en.value);
    const issues = lint({ value, lang, counterpart, kind: entry.kind });
    if (issues.length && !override) return { applied: false, issues };

    const before = lang === 'en' ? entry.en.value : (entry.fr.stagedValue ?? entry.fr.value);

    if (entry.source === 'locale' || (entry.source === 'setting' && lang === 'en')) {
      assertGitWritable(await git.status());
      if (entry.source === 'locale') {
        localeAdapter.write(entry.id.replace('locale:', ''), lang, value);
      } else {
        const [template, sectionType, settingId] = entry.id.replace('setting:', '').split('/');
        settingsAdapter.writeEn(template, sectionType, settingId, value);
      }
      history.append({ entryId: id, lang, before, after: value, action: 'save-git' });
      return { applied: true, mode: 'git', issues, diffStat: await git.diffStat() };
    }

    // Shopify-backed FR (settings + admin): stage locally
    if (!entry.fr.resourceId || !entry.fr.contentKey) {
      throw httpError(409, 'No Shopify resource known for this entry yet — hit "Refresh from Shopify" first.');
    }
    staged.set(id, lang, {
      value,
      stagedAt: new Date().toISOString(),
      resourceId: entry.fr.resourceId,
      contentKey: entry.fr.contentKey,
      baseDigest: entry.en.digest ?? null,
    });
    history.append({ entryId: id, lang, before, after: value, action: 'stage' });
    return { applied: true, mode: 'staged', issues };
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
});
