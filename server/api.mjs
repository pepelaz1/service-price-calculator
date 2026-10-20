import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const dbPath = fileURLToPath(new URL('../data/demo.sqlite', import.meta.url));
let db;

function getDb() {
  if (!db) db = new DatabaseSync(dbPath, { readOnly: true });
  return db;
}

function json(statusCode, value) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    body: JSON.stringify(value),
  };
}

function parseQuote(body) {
  if (typeof body !== 'string' || body.length > 2000) return null;
  let value;
  try { value = JSON.parse(body); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { cityId, serviceId, quantity, urgent } = value;
  if (typeof cityId !== 'string' || typeof serviceId !== 'string' ||
      !Number.isInteger(quantity) || quantity < 1 || quantity > 5 ||
      typeof urgent !== 'boolean') return null;
  return { cityId, serviceId, quantity, urgent };
}

export function handleApi(method, path, body = '') {
  if (method === 'GET' && path === '/api/health') return json(200, { status: 'ok' });

  if (method === 'GET' && path === '/api/catalog') {
    const database = getDb();
    const cities = database.prepare('SELECT id, name, coefficient_bp AS coefficientBp, visit_fee_rub AS visitFeeRub FROM cities ORDER BY name').all();
    const services = database.prepare('SELECT id, category, name, description, base_price_rub AS basePriceRub, duration_min AS durationMin FROM services ORDER BY rowid').all();
    return json(200, { cities, services, urgentRatePercent: 20, currency: 'RUB' });
  }

  if (method === 'POST' && path === '/api/quote') {
    const request = parseQuote(body);
    if (!request) return json(400, { error: 'Проверьте город, услугу и количество (от 1 до 5).' });

    const database = getDb();
    const city = database.prepare('SELECT id, name, coefficient_bp AS coefficientBp, visit_fee_rub AS visitFeeRub FROM cities WHERE id = ?').get(request.cityId);
    const service = database.prepare('SELECT id, name, base_price_rub AS basePriceRub, duration_min AS durationMin FROM services WHERE id = ?').get(request.serviceId);
    if (!city || !service) return json(404, { error: 'Выбранный город или услуга не найдены.' });

    const serviceSubtotalRub = Math.round(service.basePriceRub * request.quantity * city.coefficientBp / 10000);
    const urgentFeeRub = request.urgent ? Math.round(serviceSubtotalRub * 0.2) : 0;
    const totalRub = serviceSubtotalRub + city.visitFeeRub + urgentFeeRub;
    return json(200, {
      cityName: city.name,
      serviceName: service.name,
      quantity: request.quantity,
      urgent: request.urgent,
      basePriceRub: service.basePriceRub,
      coefficientBp: city.coefficientBp,
      serviceSubtotalRub,
      visitFeeRub: city.visitFeeRub,
      urgentFeeRub,
      totalRub,
      durationMin: service.durationMin * request.quantity,
      disclaimer: 'Демонстрационный расчёт. Цены и услуги вымышлены.',
    });
  }

  return json(404, { error: 'Маршрут не найден.' });
}
