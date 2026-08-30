import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, copyFileSync, writeFileSync, readdirSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function run(cmd, args, cwd) {
  const isWin = process.platform === 'win32';
  const res = spawnSync(isWin ? `${cmd}.cmd` : cmd, args, { cwd, stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`[build-deploy] Falha ao executar: ${cmd} ${args.join(' ')}`);
    process.exit(res.status ?? 1);
  }
}

const PUBLIC = join(__dirname, 'public');

console.log('\n[build-deploy] 1/3 Build do Admin...');
run('npm', ['run', 'build'], join(__dirname, 'Admin'));

console.log('\n[build-deploy] 2/3 Build do Cliente...');
run('npm', ['run', 'build'], join(__dirname, 'Cliente'));

console.log('\n[build-deploy] 3/3 Montando public/...');
rmSync(PUBLIC, { recursive: true, force: true });
mkdirSync(PUBLIC, { recursive: true });

function copyDist(src, destName) {
  const dist = join(src, 'dist');
  if (!existsSync(dist)) {
    console.error(`[build-deploy] dist nao encontrada em ${dist}`);
    process.exit(1);
  }
  for (const entry of readdirSync(dist)) {
    const from = join(dist, entry);
    const to = join(PUBLIC, destName, entry);
    cpSync(from, to, { recursive: true });
  }
}

copyDist(join(__dirname, 'Admin'), 'admin');
copyDist(join(__dirname, 'Cliente'), 'cliente');

const redirect = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Alcateia Barber</title>
    <meta http-equiv="refresh" content="0; url=/cliente/">
    <link rel="canonical" href="/cliente/">
  </head>
  <body>
    <script>location.replace('/cliente/');</script>
  </body>
</html>
`;
writeFileSync(join(PUBLIC, 'index.html'), redirect);

console.log('[build-deploy] Concluido. Estrutura public/:');
console.log(`  - ${join('public', 'index.html')} -> redirect /cliente/`);
console.log('  - public/admin/*  (Admin)');
console.log('  - public/cliente/* (Cliente)');
