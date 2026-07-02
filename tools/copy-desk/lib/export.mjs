// Export the unified entries. CSV (UTF-8 BOM for Excel), JSON (machine round-trip),
// XLIFF 1.2 (translator CAT tools). XLSX is deferred to v1.5 (vendored SheetJS).

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(entries) {
  const rows = [['id', 'group', 'subgroup', 'source', 'label', 'en', 'fr', 'status']];
  for (const e of entries) {
    rows.push([
      e.id, e.group, e.subgroup, e.source, e.label,
      e.en.stagedValue ?? e.en.value ?? '',
      e.fr.stagedValue ?? e.fr.value ?? '',
      e.status.join('+'),
    ]);
  }
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}

export function toJson(entries) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), entries }, null, 2);
}

function xml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function toXliff(entries) {
  const groups = {};
  for (const e of entries) (groups[e.group] ??= []).push(e);
  const files = Object.entries(groups).map(([group, list]) => {
    const units = list.map(e => {
      const fr = e.fr.stagedValue ?? e.fr.value;
      const state = fr ? 'translated' : 'needs-translation';
      return `      <trans-unit id="${xml(e.id)}" resname="${xml(e.label)}">
        <source>${xml(e.en.stagedValue ?? e.en.value)}</source>
        <target state="${state}">${xml(fr ?? '')}</target>
        <note>${xml(e.subgroup)}</note>
      </trans-unit>`;
    }).join('\n');
    return `  <file original="${xml(group)}" source-language="en" target-language="fr" datatype="plaintext">
    <body>
${units}
    </body>
  </file>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
${files}
</xliff>`;
}
