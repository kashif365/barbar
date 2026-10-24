// Builds everything for hosting that cannot run `npm run build` (e.g. shared cPanel).
// Output: deploy/public_html (the website) and deploy/api (the server as one bundled file,
// no `npm install` needed on the host). Run from the project root: `npm run deploy:build`.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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
run('npm run build', client);
cpSync(join(client, 'dist'), web, { recursive: true });

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

writeFileSync(
  join(out, 'README.txt'),
  `Upload guide (see the project README, "Deploying to cPanel", for details)

public_html/  -> upload the CONTENTS into your domain's web root (usually public_html).
                 Keep .htaccess (hidden file). Edit config.js if the API is on another domain.
api/          -> upload to a folder OUTSIDE public_html (e.g. /home/<user>/shehraz-api) and
                 create a Node.js app there with startup file server.js.
                 Copy .env.example to .env and fill it in (NODE_ENV=production).
                 First time only: run the "seed" script to create services and the owner account,
                 then remove OWNER_PASSWORD from .env.

Built: ${new Date().toISOString()}
`,
);

step('Done. Upload the contents of deploy/ (see deploy/README.txt).');
