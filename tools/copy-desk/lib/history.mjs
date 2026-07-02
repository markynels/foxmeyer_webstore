// history.jsonl — append-only change log, committed to git.
// `variant` / `experiment` are reserved for future A/B testing; always null today.
import { appendFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { userInfo } from 'node:os';

export function makeHistory(dataDir) {
  const file = join(dataDir, 'history.jsonl');

  return {
    append(event) {
      mkdirSync(dirname(file), { recursive: true });
      const line = JSON.stringify({
        ts: new Date().toISOString(),
        actor: userInfo().username,
        variant: null,
        experiment: null,
        ...event,
      });
      appendFileSync(file, line + '\n');
    },
    forEntry(entryId, limit = 50) {
      try {
        return readFileSync(file, 'utf8').trim().split('\n')
          .map(l => { try { return JSON.parse(l); } catch { return null; } })
          .filter(e => e && e.entryId === entryId)
          .slice(-limit);
      } catch { return []; }
    },
  };
}
