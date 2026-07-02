// staged.json — pending edits for Shopify-backed entries. Atomic tmp+rename writes
// (the repo lives in Google Drive; partial writes must never be visible).
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export function makeStaged(dataDir) {
  const file = join(dataDir, 'staged.json');

  function read() {
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; }
  }
  function write(obj) {
    mkdirSync(dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
    renameSync(tmp, file);
  }

  return {
    all: read,
    get(entryId, lang) { return read()[`${entryId}::${lang}`] || null; },
    set(entryId, lang, record) {
      const obj = read();
      obj[`${entryId}::${lang}`] = record;
      write(obj);
    },
    remove(entryId, lang) {
      const obj = read();
      delete obj[`${entryId}::${lang}`];
      write(obj);
    },
  };
}
