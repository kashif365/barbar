// Builds everything for hosting that cannot run `npm run build` (e.g. shared cPanel).
// Output: deploy/public_html (the website) and deploy/api (the server as one bundled file,
// no `npm install` needed on the host). Run from the project root: `npm run deploy:build`.
// deploy/ is committed; the server pulls it and runs scripts/deploy-frontend.sh (see README).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const client = join(root, 'client');
const server = join(root, 'server');
const out = join(root, 'deploy');
const web = join(out, 'public_html');
const api = join(out, 'api');

const step = (msg) => console.log(`\n> ${msg}`);
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });

for (const dir of [client, server]) {
  if (!existsSync(join(dir, 'node_modules'))) {
    step(`Installing dependencies in ${dir}`);
    run('npm install', dir);
  }
}

step('Cleaning deploy/');
rmSync(out, { recursive: true, force: true });
mkdirSync(api, { recursive: true });

step('Building the website (client)');
rmSync(join(client, 'dist'), { recursive: true, force: true }); // never mix assets from an older build
run('npm run build', client);
cpSync(join(client, 'dist'), web, { recursive: true });
// config.js holds per-server settings (the live API URL). Ship it only as a template so a deploy
// can never overwrite the one on the server; the deploy script creates config.js from it if missing.
renameSync(join(web, 'config.js'), join(web, 'config.example.js'));

step('Verifying the website build');
verifyWebsite();

step('Type-checking the server');
run('npm run typecheck', server);

step('Bundling the server into deploy/api');
const esbuild = createRequire(join(server, 'package.json'))('esbuild');
await esbuild.build({
  entryPoints: { server: join(server, 'src/server.ts'), seed: join(server, 'src/scripts/seed.ts') },
  outdir: api,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  // Optional native/cloud add-ons of the MongoDB driver and ws. They are loaded only if present.
  external: [
    'kerberos', '@mongodb-js/zstd', '@aws-sdk/credential-providers', 'gcp-metadata', 'snappy', 'socks',
    'aws4', 'mongodb-client-encryption', 'bufferutil', 'utf-8-validate',
  ],
  logLevel: 'warning',
});

writeFileSync(
  join(api, 'package.json'),
  JSON.stringify(
    {
      name: 'shehraz-barber-api',
      private: true,
      description: 'Bundled API. No dependencies to install.',
      main: 'server.js',
      scripts: { start: 'node server.js', seed: 'node seed.js' },
      engines: { node: '>=20' },
    },
    null,
    2,
  ) + '\n',
);
cpSync(join(server, '.env.example'), join(api, '.env.example'));

const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  } catch {
    return 'unknown';
  }
})();
writeFileSync(join(web, 'version.json'), JSON.stringify({ builtAt: new Date().toISOString(), sourceCommit: commit }, null, 2) + '\n');

writeFileSync(
  join(out, 'README.txt'),
  `Upload guide (see the project README, "Deploying to cPanel", for details)

public_html/  -> the website. On the server run scripts/deploy-frontend.sh, which copies it into
                 the web root, keeps the live config.js and .htaccess, and removes stale assets.
                 Manual upload: copy everything EXCEPT config.example.js over the web root; on a
                 first install, copy config.example.js to config.js and set the API URLs in it.
api/          -> upload to a folder OUTSIDE public_html (e.g. /home/<user>/shehraz-api) and
                 create a Node.js app there with startup file server.js.
                 Copy .env.example to .env and fill it in (NODE_ENV=production).
                 First time only: run the "seed" script to create services and the owner account,
                 then remove OWNER_PASSWORD from .env.

Built: ${new Date().toISOString()}
`,
);

step('Done. Commit deploy/ and pull it on the server (see README, "Deploying to cPanel").');

/** Fails the build if index.html points at a missing bundle or any site photo/video is absent. */
function verifyWebsite() {
  const problems = [];
  const html = readFileSync(join(web, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+)"/g)].map((m) => m[1]);
  if (!refs.some((r) => r.endsWith('.js')) || !refs.some((r) => r.endsWith('.css'))) problems.push('index.html does not reference a JS and a CSS bundle');
  for (const r of refs) if (!existsSync(join(web, r))) problems.push(`index.html references missing ${r}`);
  const built = readdirSync(join(web, 'assets'));
  for (const f of built) if (!refs.includes(`assets/${f}`)) problems.push(`unreferenced file in assets/: ${f}`);

  const mediaConfig = readFileSync(join(client, 'src/config/media.ts'), 'utf8');
  const media = [...new Set([...mediaConfig.matchAll(/'\/(media\/[^']+)'/g)].map((m) => m[1]))];
  if (!media.length) problems.push('no /media/ paths found in client/src/config/media.ts');
  for (const m of media) if (!existsSync(join(web, m))) problems.push(`missing ${m} (referenced in media.ts)`);
  for (const f of ['.htaccess', 'config.example.js', 'logo.png']) if (!existsSync(join(web, f))) problems.push(`missing ${f}`);

  if (problems.length) {
    console.error('\nWebsite build check failed:\n  - ' + problems.join('\n  - '));
    process.exit(1);
  }
  console.log(`  index.html -> ${refs.join(', ')}`);
  console.log(`  ${media.length} media files present`);
}
