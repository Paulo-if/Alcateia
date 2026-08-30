import { spawn } from 'node:child_process';
import { createServer, request } from 'node:http';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROUTER_PORT = 5173;
const ADMIN_PORT = 4174;
const CLIENTE_PORT = 4173;

const apps = [
  { name: 'admin', dir: 'Admin', port: ADMIN_PORT },
  { name: 'cliente', dir: 'Cliente', port: CLIENTE_PORT },
];

function route(urlPath) {
  if (urlPath === '/cliente' || urlPath.startsWith('/cliente/')) return CLIENTE_PORT;
  if (urlPath === '/admin' || urlPath.startsWith('/admin/')) return ADMIN_PORT;
  return null;
}

function startVite(app) {
  const viteBin = join(__dirname, app.dir, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(process.execPath, [viteBin], {
    cwd: join(__dirname, app.dir),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });
  child.stdout.on('data', (d) => process.stdout.write(`[${app.name}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${app.name}] ${d}`));
  child.on('exit', (code) => {
    process.stderr.write(`[${app.name}] saiu com código ${code}\n`);
  });
  return child;
}

const children = apps.map(startVite);

function normalizeReq(req) {
  const { pathname, search } = new URL(req.url, 'http://localhost');
  const headers = { ...req.headers };
  delete headers['proxy-connection'];
  return { method: req.method, urlPath: pathname + search, headers };
}

function createServerRequest(req, port) {
  const { method, urlPath, headers } = normalizeReq(req);
  const proxyReq = request({
    host: '127.0.0.1',
    port,
    method,
    path: urlPath,
    headers,
  });
  proxyReq.on('error', (err) => {
    req.destroy(err);
  });
  return proxyReq;
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const port = route(pathname);

  if (!port) {
    res.writeHead(302, { Location: '/cliente/' });
    res.end();
    return;
  }

  const proxyReq = createServerRequest(req, port);

  proxyReq.on('response', (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  req.pipe(proxyReq);
});

// Encaminha WebSockets (HMR) para a porta correta com base no caminho.
server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const port = route(pathname);
  if (!port) {
    socket.destroy();
    return;
  }

  const upstream = connect(port, '127.0.0.1', () => {
    const reqRaw = `${req.method} ${req.url} HTTP/1.1\r\n${headersToRaw(req)}\r\n`;
    upstream.write(reqRaw);
    if (head && head.length) upstream.write(head);
  });

  socket.on('error', () => upstream.destroy());
  upstream.on('error', () => socket.destroy());
  socket.pipe(upstream);
  upstream.pipe(socket);
});

function headersToRaw(req) {
  return (req.rawHeaders || [])
    .map((v, i) => (i % 2 === 0 ? `${v}: ` : `${v}\r\n`))
    .join('');
}

server.listen(ROUTER_PORT, '0.0.0.0', () => {
  process.stdout.write(`\n=== MVP Rodando ===\n`);
  process.stdout.write(`  Cliente: http://localhost:${ROUTER_PORT}/cliente\n`);
  process.stdout.write(`  Admin:   http://localhost:${ROUTER_PORT}/admin\n`);
  process.stdout.write(`  Raiz:    http://localhost:${ROUTER_PORT}/ (redireciona para /cliente)\n\n`);
});

function shutdown() {
  process.stdout.write('\nEncerrando...\n');
  for (const child of children) child.kill(isWin ? 'SIGTERM' : 'SIGTERM');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
