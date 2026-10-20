import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { handleRequest } from '../cloudflare/worker.mjs';
import { handleApi } from '../server/api.mjs';

const db = new DatabaseSync(fileURLToPath(new URL('../data/demo.sqlite', import.meta.url)), { readOnly: true });
const env = {
  DB: {
    prepare(sql) {
      const statement = db.prepare(sql);
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async all() { return { results: statement.all(...params) }; },
        async first() { return statement.get(...params) ?? null; },
      };
    },
  },
};

test('D1 seed migration contains the same catalog as the local database', () => {
  const migrated = new DatabaseSync(':memory:');
  migrated.exec(readFileSync(fileURLToPath(new URL('../migrations/0001_demo_catalog.sql', import.meta.url)), 'utf8'));
  for (const table of ['cities', 'services']) {
    assert.deepEqual(migrated.prepare(`SELECT * FROM ${table} ORDER BY id`).all(), db.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
  }
  migrated.close();
});

test('Cloudflare catalog matches the local SQLite API', async () => {
  const response = await handleRequest(new Request('https://example.test/api/catalog'), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), JSON.parse(handleApi('GET', '/api/catalog').body));
});

test('Cloudflare quote matches the local API and rejects invalid input', async () => {
  const body = JSON.stringify({ cityId: 'moscow', serviceId: 'laptop-clean', quantity: 2, urgent: true });
  const response = await handleRequest(new Request('https://example.test/api/quote', { method: 'POST', body }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), JSON.parse(handleApi('POST', '/api/quote', body).body));

  const invalid = await handleRequest(new Request('https://example.test/api/quote', { method: 'POST', body: '{' }), env);
  assert.equal(invalid.status, 400);
});
