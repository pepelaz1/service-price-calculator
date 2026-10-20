import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type City = { id: string; name: string; coefficientBp: number; visitFeeRub: number };
type Service = { id: string; category: string; name: string; description: string; basePriceRub: number; durationMin: number };
type Catalog = { cities: City[]; services: Service[]; urgentRatePercent: number; currency: string };
type Quote = {
  cityName: string;
  serviceName: string;
  quantity: number;
  urgent: boolean;
  basePriceRub: number;
  coefficientBp: number;
  serviceSubtotalRub: number;
  visitFeeRub: number;
  urgentFeeRub: number;
  totalRub: number;
  durationMin: number;
  disclaimer: string;
};

const money = (value: number) => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  let result: T & { error?: string };
  try { result = await response.json(); }
  catch { throw new Error('Сервис временно недоступен. Попробуйте позже.'); }
  if (!response.ok) throw new Error(result.error || 'Не удалось получить данные.');
  return result;
}

function ArrowIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3.5 9h10m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [cityId, setCityId] = useState('tomsk');
  const [serviceId, setServiceId] = useState('laptop-clean');
  const [quantity, setQuantity] = useState(1);
  const [urgent, setUrgent] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [quoteError, setQuoteError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Catalog>('/api/catalog').then(setCatalog).catch(error => setCatalogError(error.message));
  }, []);

  async function calculate(nextCityId = cityId, nextServiceId = serviceId, nextQuantity = quantity, nextUrgent = urgent) {
    setBusy(true);
    setQuoteError('');
    try {
      const result = await api<Quote>('/api/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cityId: nextCityId, serviceId: nextServiceId, quantity: nextQuantity, urgent: nextUrgent }),
      });
      setQuote(result);
    } catch (error) {
      setQuote(null);
      setQuoteError(error instanceof Error ? error.message : 'Ошибка расчёта.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { if (catalog) void calculate(); }, [catalog]);

  const selectedService = catalog?.services.find(item => item.id === serviceId);
  const selectedCity = catalog?.cities.find(item => item.id === cityId);

  return <>
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Мастер рядом — на главную"><span className="brand-mark">м<span>↗</span></span><span>мастер<span className="brand-dot">.</span>рядом</span></a>
        <nav aria-label="Основная навигация"><a href="#calculator">Калькулятор</a><a href="#how-it-works">Как считается</a><a href="#about">О проекте</a></nav>
        <a className="topbar-cta" href="#calculator">Рассчитать стоимость <ArrowIcon /></a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> ДЕМО-СЕРВИС · ВЫЕЗДНОЙ РЕМОНТ</div>
            <h1 id="hero-title">Понятная цена.<br /><em>До приезда мастера.</em></h1>
            <p>Выберите город и услугу — покажем предварительную стоимость ремонта с учётом выезда и срочности. Без звонков и скрытых строк.</p>
            <a className="hero-button" href="#calculator">Посчитать цену <ArrowIcon /></a>
            <div className="hero-meta"><span className="meta-icon">✓</span> Прозрачный расчёт <span className="meta-divider" /> <span className="meta-icon">✓</span> 5 городов и 5 услуг</div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-card art-card-back"><span>ГОТОВО К РАСЧЁТУ</span><strong>01<span className="art-small"> / 03</span></strong></div>
            <div className="art-card art-card-front"><div className="art-card-top"><span className="art-symbol">↗</span><span className="art-live"><i /> LIVE</span></div><div className="art-line"></div><div className="art-line short"></div><div className="art-total">Стоимость <strong>от 1 250 ₽</strong></div></div>
            <div className="art-chip chip-one">город <strong>Томск</strong></div><div className="art-chip chip-two">точный расчёт <strong>✓</strong></div>
          </div>
        </section>

        <section className="calc-section" id="calculator" aria-labelledby="calc-title">
          <div className="section-heading"><div><span className="section-kicker">01 / КАЛЬКУЛЯТОР</span><h2 id="calc-title">Рассчитайте стоимость</h2><p>Несколько параметров — и подробная смета готова.</p></div><span className="heading-stamp">БЕЗ РЕГИСТРАЦИИ <span>↗</span></span></div>
          <div className="calc-grid">
            <div className="form-card">
              <div className="card-label"><span className="step-number">1</span> Параметры услуги</div>
              {catalogError ? <div className="notice error" role="alert">{catalogError} <button type="button" onClick={() => { setCatalogError(''); api<Catalog>('/api/catalog').then(setCatalog).catch(error => setCatalogError(error.message)); }}>Повторить</button></div> : null}
              <div className="field-grid">
                <label className="field"><span>Ваш город</span><div className="select-wrap"><select value={cityId} disabled={!catalog} onChange={event => { setCityId(event.target.value); setQuote(null); }}><option value="" disabled>Выберите город</option>{catalog?.cities.map(city => <option value={city.id} key={city.id}>{city.name}</option>)}</select></div><small>Выезд мастера: {selectedCity ? money(selectedCity.visitFeeRub) : '—'}</small></label>
                <label className="field"><span>Тип услуги</span><div className="select-wrap"><select value={serviceId} disabled={!catalog} onChange={event => { setServiceId(event.target.value); setQuote(null); }}><option value="" disabled>Выберите услугу</option>{catalog?.services.map(service => <option value={service.id} key={service.id}>{service.name}</option>)}</select></div><small>{selectedService?.description || 'Загрузка услуг...'}</small></label>
              </div>
              <div className="separator" />
              <div className="qty-row"><div><label htmlFor="quantity">Количество устройств</label><p>От одного до пяти за один выезд</p></div><div className="stepper"><button type="button" aria-label="Уменьшить количество" disabled={quantity <= 1} onClick={() => { setQuantity(quantity - 1); setQuote(null); }}>−</button><input id="quantity" type="number" min="1" max="5" value={quantity} onChange={event => { const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 5) { setQuantity(value); setQuote(null); } }} /><button type="button" aria-label="Увеличить количество" disabled={quantity >= 5} onClick={() => { setQuantity(quantity + 1); setQuote(null); }}>+</button></div></div>
              <label className="urgent-row"><span className="urgent-text"><strong>Срочный выезд</strong><span>Приоритетная запись · +20% к стоимости работ</span></span><span className="switch"><input type="checkbox" checked={urgent} onChange={event => { setUrgent(event.target.checked); setQuote(null); }} /><span className="switch-track" /></span></label>
              <button className="calculate-button" type="button" disabled={!catalog || busy} onClick={() => void calculate()}>{busy ? 'Считаем…' : 'Получить расчёт'} <ArrowIcon /></button>
              {quoteError ? <p className="form-error" role="alert">{quoteError}</p> : null}
              <div className="form-footnote"><span>ⓘ</span> Расчёт выполняется на сервере по тарифам из SQLite.</div>
            </div>

            <div className="result-card" aria-live="polite">
              <div className="result-top"><div><span className="step-number dark">2</span> ВАША СМЕТА</div><span className="result-badge">ПРЕДВАРИТЕЛЬНО</span></div>
              {quote ? <><div className="result-service"><span>{quote.serviceName}</span><strong>{quote.cityName} · {quote.quantity} {quote.quantity === 1 ? 'устройство' : 'устройства'}</strong></div><div className="result-divider" />
                <div className="breakdown"><div><span>Работы ({quote.quantity} шт. × {money(quote.basePriceRub)})</span><strong>{money(quote.serviceSubtotalRub)}</strong></div><div><span>Выезд мастера</span><strong>{money(quote.visitFeeRub)}</strong></div>{quote.urgent ? <div><span>Срочный выезд (+20%)</span><strong>{money(quote.urgentFeeRub)}</strong></div> : null}</div>
                <div className="result-divider" /><div className="total-row"><span>Итого</span><strong>{money(quote.totalRub)}</strong></div><div className="result-bottom"><span className="result-sparkle">✳</span><span>Ориентировочное время работ — {quote.durationMin} мин.<br />{quote.disclaimer}</span></div>
              </> : <div className="empty-result"><span>↗</span><strong>Ваша смета появится здесь</strong><p>Выберите параметры слева и нажмите «Получить расчёт».</p></div>}
            </div>
          </div>
        </section>

        <section className="how-section" id="how-it-works"><div className="section-heading"><div><span className="section-kicker">02 / КАК ЭТО РАБОТАЕТ</span><h2>Всё прозрачно</h2></div></div><div className="feature-grid"><article><span className="feature-index">01</span><div className="feature-icon">⌖</div><h3>Выбираете город</h3><p>У каждого города свой коэффициент и фиксированная стоимость выезда.</p></article><article><span className="feature-index">02</span><div className="feature-icon">▦</div><h3>Указываете услугу</h3><p>Тарифы и примерное время работ хранятся в базе SQLite на сервере.</p></article><article><span className="feature-index">03</span><div className="feature-icon">↗</div><h3>Получаете смету</h3><p>Сервер рассчитывает работы, выезд и доплату за срочность одной суммой.</p></article></div></section>
      </main>
      <footer id="about"><div><a className="brand footer-brand" href="#top"><span className="brand-mark">м<span>↗</span></span><span>мастер<span className="brand-dot">.</span>рядом</span></a><p>Демонстрационный проект. Реальные заказы не принимаются.</p></div><div className="footer-right">React · Node.js · SQLite <span>© 2026</span></div></footer>
    </div>
  </>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
