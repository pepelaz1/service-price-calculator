import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleApi } from '../server/api.mjs';
import { handler } from '../server/handler.mjs';

test('catalog is backed by the seeded SQLite file', () => {
  const response = handleApi('GET', '/api/catalog');
  const catalog = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(catalog.cities.length, 5);
  assert.equal(catalog.services.length, 5);
  assert.ok(catalog.cities.some(city => city.id === 'tomsk'));
});

test('quote applies city coefficient, visit fee and urgent surcharge', () => {
  const response = handleApi('POST', '/api/quote', JSON.stringify({ cityId: 'moscow', serviceId: 'laptop-clean', quantity: 2, urgent: true }));
  const quote = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(quote.serviceSubtotalRub, 4860);
  assert.equal(quote.visitFeeRub, 750);
  assert.equal(quote.urgentFeeRub, 972);
  assert.equal(quote.totalRub, 6582);
});

test('invalid input does not query arbitrary IDs or quantities', () => {
  for (const input of [
    '{',
    JSON.stringify({ cityId: 'tomsk', serviceId: 'diagnostics', quantity: 0, urgent: false }),
    JSON.stringify({ cityId: 'tomsk', serviceId: 'diagnostics', quantity: 1.5, urgent: false }),
    JSON.stringify({ cityId: 'tomsk', serviceId: 'diagnostics', quantity: 1, urgent: 'yes' }),
  ]) assert.equal(handleApi('POST', '/api/quote', input).statusCode, 400);
  assert.equal(handleApi('POST', '/api/quote', JSON.stringify({ cityId: 'unknown', serviceId: 'diagnostics', quantity: 1, urgent: false })).statusCode, 404);
});

test('serverless adapter returns the same quote as local API', async () => {
  const body = JSON.stringify({ cityId: 'tomsk', serviceId: 'diagnostics', quantity: 1, urgent: false });
  const response = await handler({ httpMethod: 'POST', path: '/api/quote', body, isBase64Encoded: false });
  assert.equal(JSON.parse(response.body).totalRub, 1250);
});
