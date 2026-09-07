/**
 * A ~50 line static file server, written with nothing but Node's standard
 * library. You will meet a real framework in Backend Stage 2; the point here is
 * that "a web server" is not magic - it reads a file and writes bytes.
 *
 *   npm run dev --workspace frontend-stage-1-web-foundations
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'src');
const port = Number(process.env.PORT) || 5100;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  // `normalize` collapses "../" so a request can never escape `src/`.
  const requested = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const relative = requested === '/' ? 'index.html' : requested.replace(/^([/\\])+/, '');
  const filePath = join(root, relative);

  if (!filePath.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}).listen(port, () => {
  console.log(`Stage 1 running at http://localhost:${port}`);
});
