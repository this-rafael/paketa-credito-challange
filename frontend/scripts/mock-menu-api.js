const http = require('http');

/** @typedef {{ id: string, name: string, relatedId: string | null }} Flat */

/** @type {Flat[]} */
let items = [
  { id: '1', name: 'Eletrodomésticos', relatedId: null },
  { id: '2', name: 'Televisores', relatedId: '1' },
  { id: '3', name: 'LCD', relatedId: '2' },
  { id: '4', name: '110', relatedId: '3' },
  { id: '5', name: '220', relatedId: '3' },
  { id: '6', name: 'Plasma', relatedId: '2' },
  { id: '7', name: 'Informática', relatedId: null },
  { id: '8', name: 'Computadores', relatedId: '7' },
  { id: '9', name: 'Apple', relatedId: '8' },
  { id: '10', name: 'MacBook', relatedId: '9' },
  { id: '11', name: 'Cabos', relatedId: '10' },
  { id: '12', name: 'iMac', relatedId: '9' },
];

let nextId = 13;

function buildTree(parentId = null) {
  return items
    .filter((item) => item.relatedId === parentId)
    .map((item) => {
      const submenus = buildTree(item.id);
      return submenus.length
        ? { id: item.id, name: item.name, submenus }
        : { id: item.id, name: item.name };
    });
}

function collectDescendants(id, acc = new Set()) {
  for (const item of items) {
    if (item.relatedId === id && !acc.has(item.id)) {
      acc.add(item.id);
      collectDescendants(item.id, acc);
    }
  }
  return acc;
}

function send(res, status, body) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204);
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost:3000');

  if (req.method === 'GET' && url.pathname === '/api/v1/menu') {
    send(res, 200, buildTree());
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/menu') {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        const body = JSON.parse(raw || '{}');
        if (!body.name || typeof body.name !== 'string') {
          send(res, 400, { message: 'name is required' });
          return;
        }
        if (items.some((i) => i.name === body.name)) {
          send(res, 409, { message: 'name must be unique' });
          return;
        }
        let relatedId = null;
        if (body.relatedId !== undefined && body.relatedId !== null && body.relatedId !== '') {
          relatedId = String(body.relatedId);
          if (!items.some((i) => i.id === relatedId)) {
            send(res, 404, { message: 'parent not found' });
            return;
          }
        }
        const id = String(nextId++);
        items.push({ id, name: body.name, relatedId });
        send(res, 201, { id });
      } catch {
        send(res, 400, { message: 'invalid json' });
      }
    });
    return;
  }

  const deleteMatch = url.pathname.match(/^\/api\/v1\/menu\/([^/]+)$/);
  if (req.method === 'DELETE' && deleteMatch) {
    const id = decodeURIComponent(deleteMatch[1]);
    if (!items.some((i) => i.id === id)) {
      send(res, 404, { message: 'not found' });
      return;
    }
    const remove = collectDescendants(id);
    remove.add(id);
    items = items.filter((i) => !remove.has(i.id));
    send(res, 200, {});
    return;
  }

  send(res, 404, { message: 'not found' });
});

server.listen(3000, () => {
  console.log('Mock menu API on http://localhost:3000');
});
