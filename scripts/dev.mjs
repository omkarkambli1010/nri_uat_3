// Starts the Next dev server with the right Node flags for the running Node.
//
// --use-system-ca makes Node trust the OS certificate store, which the dev
// /nriapi -> udn.sbisecurities.in proxy needs on networks that terminate TLS
// with an internal CA. It is only permitted inside NODE_OPTIONS from Node
// 22.15 / 24 onward; older versions refuse to start at all:
//
//     node: --use-system-ca is not allowed in NODE_OPTIONS
//
// Hard-coding the flag therefore breaks `npm run dev` for anyone on an older
// Node, and removing it breaks the proxy for everyone behind TLS interception.
// This script picks per-machine so neither group has to edit package.json.
//
// Any extra arguments are forwarded to `next dev`, e.g. npm run dev -- -p 3001

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const [major, minor] = process.versions.node.split('.').map(Number);
const supportsSystemCa = major > 22 || (major === 22 && minor >= 15);

const nodeOptions = ['--insecure-http-parser'];
if (supportsSystemCa) {
  nodeOptions.push('--use-system-ca');
} else {
  console.warn(
    `[dev] Node ${process.versions.node} does not support --use-system-ca ` +
      `(needs >= 22.15). Starting without it — if /nriapi calls fail with ` +
      `SELF_SIGNED_CERT_IN_CHAIN, upgrade Node.`
  );
}

// Resolve Next's CLI entry and run it with this same node binary, rather than
// shelling out to the `next` wrapper — avoids .cmd/quoting differences on
// Windows, where the build agent and most of the team run.
const nextBin = require.resolve('next/dist/bin/next');

const child = spawn(process.execPath, [nextBin, 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_ENV: 'development',
    NODE_OPTIONS: [process.env.NODE_OPTIONS, ...nodeOptions]
      .filter(Boolean)
      .join(' '),
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
