import { createServer } from 'node:http';
import { handleApi } from './api.mjs';

const port = Number(process.env.PORT || 8787);
const server = createServer(async (req, res) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2000) {
      res.writeHead(413, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Слишком большой запрос.' }));
      return;
    }
    chunks.push(chunk);
  }
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  const result = handleApi(req.method || 'GET', path, Buffer.concat(chunks).toString('utf8'));
  res.writeHead(result.statusCode, result.headers);
  res.end(result.body);
});
server.listen(port, '127.0.0.1', () => console.log(`API: http://127.0.0.1:${port}`));
