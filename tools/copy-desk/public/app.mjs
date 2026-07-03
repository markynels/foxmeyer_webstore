// Copy Desk front end — vanilla JS, no build step.
let state = null;
let activeGroup = null;

const $ = sel => document.querySelector(sel);

async function api(path, body) {
  const res = await fetch(path, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  } : undefined);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function toast(msg, ms = 3500) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, ms);
}

async function load() {
  state = await api('/api/state');
  $('#staged-count').textContent = state.stagedCount;
  $('#btn-ai-group').hidden = !state.ai?.connected;
  $('#btn-connect').hidden = !state.shopify.canConnect;
  renderBanner();
  renderNav();
  renderRows();
}

function renderBanner() {
  const b = $('#banner');
  const g = state.git;
  const msgs = [];
  if (g.behind > 0) msgs.push(`⚠ origin/${g.branch} is ${g.behind} commit(s) ahead (customizer auto-commit?). Pull before editing theme copy — git-backed saves are blocked.`);
  if (g.inProgress) msgs.push('⚠ A git merge/rebase is in progress.');
  if (!state.shopify.connected) {
    msgs.push(state.shopify.canConnect
      ? 'Shopify not connected — click “Connect Shopify” above to authorize (opens Shopify, comes back to localhost — no tunnel).'
      : 'Shopify not connected — FR for section settings and admin content unavailable. See tools/copy-desk/README.md.');
  }
  else if (!state.shopify.fetchedAt) msgs.push('No Shopify data cached yet — hit "Refresh from Shopify".');
  if (state.shopify.missingScopes?.length) msgs.push('Missing API scopes for: ' + state.shopify.missingScopes.map(m => m.type).join(', '));
  if (!state.ai?.connected) msgs.push('AI transcreation not configured — add ANTHROPIC_API_KEY to tools/copy-desk/.env for FR drafts.');
  b.hidden = msgs.length === 0;
  b.textContent = msgs.join('  ·  ');
  b.className = g.behind > 0 || g.inProgress ? 'err' : '';
}

function groupCounts(entries) {
  const counts = {};
  for (const e of entries) {
    const c = counts[e.group] ??= { untranslated: 0, staged: 0, dirty: 0, total: 0 };
    c.total++;
    for (const s of e.status) if (c[s] !== undefined) c[s]++;
  }
  return counts;
}

function renderNav() {
  const counts = groupCounts(state.entries);
  const groups = [...new Set(state.entries.map(e => e.group))];
  if (!activeGroup || !groups.includes(activeGroup)) activeGroup = groups[0];
  $('#groups').innerHTML = groups.map(g => {
    const c = counts[g];
    const badges =
      (c.untranslated ? `<span class="badge untranslated" title="untranslated">${c.untranslated}</span>` : '') +
      (c.staged ? `<span class="badge staged" title="staged">${c.staged}</span>` : '') +
      (c.dirty ? `<span class="badge dirty" title="uncommitted">${c.dirty}</span>` : '');
    return `<a href="#" data-group="${g}" class="${g === activeGroup ? 'active' : ''}">
      <span>${g}</span><span class="badges">${badges}</span></a>`;
  }).join('');
  for (const a of document.querySelectorAll('#groups a')) {
    a.onclick = ev => { ev.preventDefault(); activeGroup = a.dataset.group; renderNav(); renderRows(); };
  }
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderRows() {
  const untransOnly = $('#filter-untranslated').checked;
  const q = $('#search').value.trim().toLowerCase();
  let list = state.entries.filter(e => e.group === activeGroup);
  if (untransOnly) list = list.filter(e => e.status.includes('untranslated'));
  if (q) list = list.filter(e =>
    (e.label + ' ' + e.id + ' ' + (e.en.value || '') + ' ' + (e.fr.value || '')).toLowerCase().includes(q));

  const bySub = {};
  for (const e of list) (bySub[e.subgroup] ??= []).push(e);

  $('#rows').innerHTML = Object.entries(bySub).map(([sub, entries]) => `
    <h2 class="subgroup">${esc(sub)}</h2>
    ${entries.map(rowHtml).join('')}
  `).join('') || '<p class="muted">Nothing here.</p>';

  for (const ta of document.querySelectorAll('#rows textarea')) wireTextarea(ta);
  autosizeAll();
}

function chipHtml(s) { return `<span class="chip ${s}">${s}</span>`; }

function cellHtml(e, lang) {
  const side = e[lang];
  const current = side.stagedValue ?? side.value ?? '';
  const readonly = lang === 'en' && side.readonly;
  const stagedNote = side.stagedValue !== undefined ? ' (staged)' : '';
  const aiBtn = lang === 'fr' && state.ai?.connected && (e.en.stagedValue ?? e.en.value)
    ? '<button class="btn-ai" title="Generate a French transcreation of the EN text with AI — review before saving">✦ AI draft</button>'
    : '';
  return `<div class="cell">
    <div class="cell-head">
      <span class="lang">${lang}${stagedNote}${readonly ? ' · read-only (edit in admin)' : ''}</span>
      ${aiBtn}
    </div>
    <textarea data-id="${esc(e.id)}" data-lang="${lang}" ${readonly ? 'readonly' : ''}
      data-original="${esc(current)}">${esc(current)}</textarea>
    <div class="save-strip" hidden>
      <button class="btn-save">${e.source === 'locale' || (e.source === 'setting' && lang === 'en') ? 'Save to repo' : 'Stage'}</button>
      <button class="btn-revert">Revert</button>
    </div>
    <div class="issues" hidden></div>
  </div>`;
}

function rowHtml(e) {
  const src = { locale: 'locale file (git)', setting: e.en.file + ' (git) / Shopify FR', admin: 'Shopify admin' }[e.source];
  return `<div class="row" data-id="${esc(e.id)}">
    <div class="row-meta">
      <span class="label">${esc(e.label)}</span>
      <span class="src">${esc(src)}</span>
      <div class="chips">${e.status.map(chipHtml).join('')}</div>
    </div>
    ${cellHtml(e, 'en')}
    ${cellHtml(e, 'fr')}
  </div>`;
}

function autosize(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 400) + 'px'; }
function autosizeAll() { document.querySelectorAll('#rows textarea').forEach(autosize); }

function wireTextarea(ta) {
  const cell = ta.closest('.cell');
  const strip = cell.querySelector('.save-strip');
  const issuesBox = cell.querySelector('.issues');

  ta.addEventListener('input', () => {
    autosize(ta);
    const changed = ta.value !== ta.dataset.original;
    ta.classList.toggle('changed', changed);
    strip.hidden = !changed;
    issuesBox.hidden = true;
  });

  cell.querySelector('.btn-revert').onclick = () => {
    ta.value = ta.dataset.original;
    ta.dispatchEvent(new Event('input'));
  };

  const aiBtn = cell.querySelector('.btn-ai');
  if (aiBtn) aiBtn.onclick = async () => {
    aiBtn.disabled = true;
    aiBtn.textContent = 'Translating…';
    try {
      const res = await api('/api/translate', { id: ta.dataset.id });
      ta.value = res.value;
      ta.dispatchEvent(new Event('input')); // shows Save/Stage strip
      if (res.issues?.length) {
        issuesBox.hidden = false;
        issuesBox.innerHTML = res.issues.map(i =>
          `<div class="${i.severity}">${i.severity === 'error' ? '✖' : '⚠'} ${esc(i.message)}</div>`).join('');
      }
      toast('AI draft inserted — review, adjust, then Save/Stage.');
    } catch (e) { toast('✖ ' + e.message, 6000); }
    aiBtn.disabled = false;
    aiBtn.textContent = '✦ AI draft';
  };

  cell.querySelector('.btn-save').onclick = async (ev, override = false) => {
    try {
      const res = await api('/api/edit', { id: ta.dataset.id, lang: ta.dataset.lang, value: ta.value, override });
      if (!res.applied) {
        issuesBox.hidden = false;
        issuesBox.innerHTML = res.issues.map(i =>
          `<div class="${i.severity}">${i.severity === 'error' ? '✖' : '⚠'} ${esc(i.message)}</div>`).join('') +
          `<label><input type="checkbox" class="chk-override"> Save anyway</label> <button class="btn-force">Confirm</button>`;
        issuesBox.querySelector('.btn-force').onclick = () => {
          if (issuesBox.querySelector('.chk-override').checked) cell.querySelector('.btn-save').onclick(null, true);
          else toast('Tick "Save anyway" to override the lint findings.');
        };
        return;
      }
      toast(res.mode === 'git'
        ? `Saved to repo.${res.diffStat ? '\n' + res.diffStat : ''}\nReview with git diff, then commit & push to deploy.`
        : 'Staged. Use "Publish staged" to push to Shopify.');
      await load();
    } catch (e) { toast('✖ ' + e.message, 6000); }
  };
}

// ---- top-level actions ----
$('#btn-connect').onclick = () => { window.location.href = '/shopify/install'; };

$('#btn-refresh').onclick = async () => {
  const btn = $('#btn-refresh');
  btn.disabled = true; btn.textContent = 'Refreshing…';
  try {
    const res = await api('/api/refresh', {});
    toast(`Fetched ${res.resourceCount} resources from Shopify.` +
      (res.missingScopes.length ? `\nMissing scopes: ${res.missingScopes.map(m => m.type).join(', ')}` : ''));
    await load();
  } catch (e) { toast('✖ ' + e.message, 6000); }
  btn.disabled = false; btn.textContent = 'Refresh from Shopify';
};

$('#btn-publish').onclick = async () => {
  if (!state.stagedCount) { toast('Nothing staged.'); return; }
  if (!confirm(`Publish ${state.stagedCount} staged translation(s) to Shopify? This changes live store content.`)) return;
  try {
    const res = await api('/api/publish', {});
    let msg = `Published ${res.published.length} translation(s).`;
    if (res.excluded.length) msg += '\nExcluded (EN source changed — re-stage):\n' +
      res.excluded.map(x => `· ${x.entryId}: ${x.reason}`).join('\n');
    toast(msg, 8000);
    await load();
  } catch (e) { toast('✖ ' + e.message, 8000); }
};

$('#btn-ai-group').onclick = async () => {
  const btn = $('#btn-ai-group');
  const missing = state.entries.filter(e =>
    e.group === activeGroup && e.status.includes('untranslated') && (e.en.stagedValue ?? e.en.value));
  if (!missing.length) { toast(`No untranslated entries in “${activeGroup}”.`); return; }
  if (!confirm(
    `AI-transcreate ${missing.length} untranslated entr${missing.length === 1 ? 'y' : 'ies'} in “${activeGroup}”?\n\n` +
    'Nothing goes live: git-backed results are written to locales/fr.json (review via git diff before pushing); ' +
    'Shopify-backed results are staged (review before “Publish staged”).')) return;
  btn.disabled = true;
  btn.textContent = `Translating ${missing.length}…`;
  try {
    const res = await api('/api/translate-missing', { group: activeGroup });
    let msg = `AI-filled ${res.applied.length} FR entr${res.applied.length === 1 ? 'y' : 'ies'} — review before commit/publish.`;
    if (res.flagged.length) msg += '\nSkipped (lint findings — use the per-row ✦ button):\n' +
      res.flagged.map(f => `· ${f.id}: ${f.issues.map(i => i.message).join('; ')}`).join('\n');
    if (res.failed.length) msg += '\nFailed:\n' + res.failed.map(f => `· ${f.id}: ${f.error}`).join('\n');
    toast(msg, 10000);
    await load();
  } catch (e) { toast('✖ ' + e.message, 8000); }
  btn.disabled = false;
  btn.textContent = '✦ AI-fill missing FR (group)';
};

$('#filter-untranslated').onchange = renderRows;
$('#search').oninput = renderRows;

// periodic upstream check (customizer auto-commits)
setInterval(async () => {
  try {
    state.git = await api('/api/git-fetch', {});
    renderBanner();
  } catch { /* offline is fine */ }
}, 180000);

load().catch(e => toast('✖ ' + e.message, 10000));
