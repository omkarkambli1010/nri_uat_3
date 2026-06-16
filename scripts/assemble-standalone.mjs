// Assembles a self-contained Next.js standalone build.
//
// `output: 'standalone'` emits .next/standalone/server.js with a minimal
// node_modules, but it does NOT copy the static assets or the public folder.
// This script copies them into place so the standalone folder can be zipped
// and dropped onto the IIS server as-is and run with `node server.js`.
//
// Runs automatically after `next build` via the "postbuild" npm script.

import { cp, access } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function main() {
  if (!(await exists(standalone))) {
    console.error('[assemble-standalone] .next/standalone not found — is output:"standalone" set in next.config?');
    process.exit(1);
  }

  // .next/static -> .next/standalone/.next/static
  await cp(join(root, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true });

  // public -> .next/standalone/public (skip if the project has no public/)
  if (await exists(join(root, 'public'))) {
    await cp(join(root, 'public'), join(standalone, 'public'), { recursive: true });
  }

  console.log('[assemble-standalone] Done. Deploy the .next/standalone folder and run: node server.js');
}

main().catch((err) => {
  console.error('[assemble-standalone] Failed:', err);
  process.exit(1);
});
