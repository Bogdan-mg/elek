// Kleine statische webserver voor de tests en om de app lokaal te bekijken.
// Zonder dependencies: node tests/server.mjs [poort]

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

export function startServer(wortel = process.cwd(), poort = 0) {
  const server = createServer(async (verzoek, antwoord) => {
    try {
      const pad = decodeURIComponent(new URL(verzoek.url, 'http://x').pathname);
      const bestand = join(wortel, normalize(pad === '/' ? '/index.html' : pad));
      if (!bestand.startsWith(wortel)) { antwoord.writeHead(403).end(); return; }
      const data = await readFile(bestand);
      antwoord.writeHead(200, { 'content-type': TYPES[extname(bestand)] || 'application/octet-stream' });
      antwoord.end(data);
    } catch {
      antwoord.writeHead(404).end('niet gevonden');
    }
  });
  return new Promise((klaar) => server.listen(poort, '127.0.0.1', () => klaar(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const poort = Number(process.argv[2]) || 8080;
  startServer(process.cwd(), poort).then(() => console.log(`http://127.0.0.1:${poort}`));
}
