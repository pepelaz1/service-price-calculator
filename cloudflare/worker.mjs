const json = (data, status = 200) => Response.json(data, {
  status,
  headers: { 'cache-control': 'no-store' },
});

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

export async function handleRequest(request, env) {
  const path = new URL(request.url).pathname;

  if (request.method === 'GET' && path === '/api/health') return json({ status: 'ok' });

  if (request.method === 'GET' && path === '/api/catalog') {
    const [cities, services] = await Promise.all([
      env.DB.prepare('SELECT id, name, coefficient_bp AS coefficientBp, visit_fee_rub AS visitFeeRub FROM cities ORDER BY name').all(),
      env.DB.prepare('SELECT id, category, name, description, base_price_rub AS basePriceRub, duration_min AS durationMin FROM services ORDER BY rowid').all(),
    ]);
    return json({ cities: cities.results, services: services.results, urgentRatePercent: 20, currency: 'RUB' });
  }

  if (request.method === 'POST' && path === '/api/quote') {
    if (Number(request.headers.get('content-length')) > 2000) return json({ error: 'Проверьте город, услугу и количество (от 1 до 5).' }, 400);
    const input = parseQuote(await request.text());
    if (!input) return json({ error: 'Проверьте город, услугу и количество (от 1 до 5).' }, 400);

    const [city, service] = await Promise.all([
      env.DB.prepare('SELECT id, name, coefficient_bp AS coefficientBp, visit_fee_rub AS visitFeeRub FROM cities WHERE id = ?').bind(input.cityId).first(),
      env.DB.prepare('SELECT id, name, base_price_rub AS basePriceRub, duration_min AS durationMin FROM services WHERE id = ?').bind(input.serviceId).first(),
    ]);
    if (!city || !service) return json({ error: 'Выбранный город или услуга не найдены.' }, 404);

    const serviceSubtotalRub = Math.round(service.basePriceRub * input.quantity * city.coefficientBp / 10000);
    const urgentFeeRub = input.urgent ? Math.round(serviceSubtotalRub * 0.2) : 0;
    return json({
      cityName: city.name,
      serviceName: service.name,
      quantity: input.quantity,
      urgent: input.urgent,
      basePriceRub: service.basePriceRub,
      coefficientBp: city.coefficientBp,
      serviceSubtotalRub,
      visitFeeRub: city.visitFeeRub,
      urgentFeeRub,
      totalRub: serviceSubtotalRub + city.visitFeeRub + urgentFeeRub,
      durationMin: service.durationMin * input.quantity,
      disclaimer: 'Демонстрационный расчёт. Цены и услуги вымышлены.',
    });
  }

  return json({ error: 'Маршрут не найден.' }, 404);
}

export default {
  async fetch(request, env) {
    return new URL(request.url).pathname.startsWith('/api/')
      ? handleRequest(request, env)
      : env.ASSETS.fetch(request);
  },
};
