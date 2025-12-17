import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const gitDir = path.join(process.cwd(), '.git');

if (!existsSync(gitDir)) {
  process.exit(0);
}

try {
  execSync('husky install', { stdio: 'inherit' });
} catch (error) {
  console.warn('husky install failed (skipped):', error?.message ?? error);
}

