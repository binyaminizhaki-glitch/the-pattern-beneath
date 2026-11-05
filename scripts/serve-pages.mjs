import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const prefix = '/the-pattern-beneath/';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (!pathname.startsWith(prefix)) {
      response.writeHead(404);
      response.end();
      return;
    }
    const file = path.resolve(root, pathname.slice(prefix.length) || 'index.html');
    if (path.relative(root, file).startsWith('..')) throw new Error('Outside build');
    const bytes = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    });
    response.end(bytes);
  } catch {
    response.writeHead(404);
    response.end();
  }
}).listen(4174, '127.0.0.1', () =>
  console.log(`Local production subpath: http://127.0.0.1:4174${prefix}`),
);
