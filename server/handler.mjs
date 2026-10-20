import { handleApi } from './api.mjs';

// Entry point for Yandex Cloud Functions (Node.js 22 runtime).
export async function handler(event) {
  let body = event.body || '';
  if (event.isBase64Encoded && body) body = Buffer.from(body, 'base64').toString('utf8');
  const path = event.path || event.requestContext?.http?.path || '/';
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  return handleApi(method, path, body);
}
