import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const gitDir = path.join(process.cwd(), '.git');

if (!existsSync(gitDir)) {
  process.exit(0);
}

try {
  const hooksPathResult = spawnSync('git', ['config', '--get', 'core.hooksPath'], {
    encoding: 'utf8',
  });

  if (hooksPathResult.status === 0 && hooksPathResult.stdout.trim() === '.husky/_') {
    process.exit(0);
  }

  if (!existsSync(path.join(process.cwd(), 'node_modules', 'husky'))) {
    process.exit(0);
  }

  const { default: husky } = await import('husky');
  const output = husky();
  if (typeof output === 'string' && output.trim().length > 0) {
    console.log(output.trim());
  }
} catch (error) {
  console.warn('husky setup failed (skipped):', error?.message ?? error);
}
