/**
 * An HTTP server with no framework, so you can see what Express is actually
 * doing for you.
 *
 *   node src/rawServer.mjs
 *   curl -i localhost:3100/api/tasks
 *   curl -i -X POST localhost:3100/api/tasks -H 'content-type: application/json' -d '{"title":"Ship it"}'
 *
 * Read the four sections below. Each one is a thing a framework hands you, and
 * each one is a thing people get subtly wrong by hand.
 */

import { createServer } from 'node:http';

const port = Number(process.env.PORT) || 3100;

const tasks = [
  { id: '1', title: 'Understand the request/response cycle', done: false },
  { id: '2', title: 'Read an HTTP body from a stream', done: false },
];

/**
 * 1. THE BODY IS A STREAM.
 *
 * `req` is a Readable stream, not an object with a `.body`. HTTP delivers the
 * body in chunks and you have to collect them.
 *
 * Note the size limit. Without one, a single request can exhaust your process's
 * memory - the simplest denial-of-service there is. `express.json({ limit })`
 * does this for you; by hand it is yours to remember.
 */
async function readJsonBody(req, { maxBytes = 100_000 } = {}) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      // 413 is the correct status, and destroying the socket stops the client
      // continuing to send a body we are not going to read.
      const error = new Error('Payload too large');
      error.status = 413;
      req.destroy();
      throw error;
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw === '') return {};

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Body is not valid JSON');
    error.status = 400;
    throw error;
  }
}

/**
 * 2. YOU MUST SET THE HEADERS YOURSELF.
 *
 * Forget `content-type` and browsers guess - sometimes as `text/plain`, which
 * makes `response.json()` fail with a message that has nothing to do with the
 * real problem.
 */
function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    // Without an explicit length, Node uses chunked transfer encoding. Fine,
    // but a framework computes this for you and some clients prefer it.
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = createServer(async (req, res) => {
  /**
   * 3. THERE IS NO ROUTER.
   *
   * `req.url` is a string containing the path AND the query string. You parse
   * it, match it, and extract params by hand. Every `if` here is a route the
   * framework would have declared for you - and note that a real router also
   * handles trailing slashes, URL decoding and method-not-allowed.
   */
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const { pathname } = url;
  const method = req.method ?? 'GET';

  try {
    if (pathname === '/health') {
      return sendJson(res, 200, { status: 'ok' });
    }

    if (pathname === '/api/tasks' && method === 'GET') {
      const done = url.searchParams.get('done');
      const filtered = done === null ? tasks : tasks.filter((t) => String(t.done) === done);
      return sendJson(res, 200, { data: filtered });
    }

    if (pathname === '/api/tasks' && method === 'POST') {
      const body = await readJsonBody(req);

      if (typeof body.title !== 'string' || body.title.trim().length < 3) {
        return sendJson(res, 400, { error: { message: 'title must be at least 3 characters' } });
      }

      const task = { id: String(tasks.length + 1), title: body.title.trim(), done: false };
      tasks.push(task);

      // 201 Created, with a Location header pointing at the new resource.
      res.writeHead(201, {
        'content-type': 'application/json; charset=utf-8',
        location: `/api/tasks/${task.id}`,
      });
      return res.end(JSON.stringify({ data: task }));
    }

    // A path that exists for one method but not another should be 405, not 404.
    if (pathname === '/api/tasks') {
      res.setHeader('allow', 'GET, POST');
      return sendJson(res, 405, { error: { message: `${method} not allowed on ${pathname}` } });
    }

    return sendJson(res, 404, { error: { message: `Cannot ${method} ${pathname}` } });
  } catch (error) {
    /**
     * 4. ONE MISSED ERROR HANGS THE REQUEST FOREVER.
     *
     * If nothing calls `res.end()`, the client waits until it times out. No
     * error page, no 500 - just a spinner. This is why a framework's error
     * handler is a genuine feature and not boilerplate.
     */
    const status = error.status ?? 500;
    if (status >= 500) console.error(error);
    return sendJson(res, status, { error: { message: error.message } });
  }
});

server.listen(port, () => {
  console.log(`Raw HTTP server on http://localhost:${port}`);
  console.log('Try:  curl -i localhost:%d/api/tasks', port);
});
