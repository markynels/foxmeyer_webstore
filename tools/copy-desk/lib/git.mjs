// Spaces-safe git helpers — execFile with arg arrays, never shell strings.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export function makeGit(repoRoot) {
  async function git(...args) {
    const { stdout } = await run('git', ['-C', repoRoot, ...args], { maxBuffer: 10 * 1024 * 1024 });
    return stdout;
  }

  return {
    async status() {
      const branch = (await git('rev-parse', '--abbrev-ref', 'HEAD')).trim();
      const porcelain = (await git('status', '--porcelain')).trim();
      let ahead = 0, behind = 0, hasUpstream = true;
      try {
        const counts = (await git('rev-list', '--left-right', '--count', `${branch}...origin/${branch}`)).trim();
        [ahead, behind] = counts.split('\t').map(Number);
      } catch { hasUpstream = false; }
      let inProgress = false;
      try {
        const dir = (await git('rev-parse', '--git-dir')).trim();
        const { existsSync } = await import('node:fs');
        const { join, isAbsolute } = await import('node:path');
        const gitDir = isAbsolute(dir) ? dir : join(repoRoot, dir);
        inProgress = ['MERGE_HEAD', 'REBASE_HEAD', 'CHERRY_PICK_HEAD'].some(f => existsSync(join(gitDir, f)));
      } catch { /* best effort */ }
      return { branch, ahead, behind, hasUpstream, dirtyFiles: porcelain ? porcelain.split('\n').map(l => l.slice(3)) : [], inProgress };
    },
    async fetch() {
      try { await git('fetch', '--quiet'); return true; } catch { return false; }
    },
    // Contents of a file at HEAD (null if it didn't exist).
    async showHead(relPath) {
      try { return await git('show', `HEAD:${relPath}`); } catch { return null; }
    },
    async diffStat() {
      return (await git('diff', '--stat')).trim();
    },
  };
}
