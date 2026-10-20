import React, { useEffect, useRef, useState } from 'react';
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

type DropdownOption = { id: string; label: string; detail: string };

function Dropdown({ id, label, value, options, disabled, placeholder, onChange }: {
  id: string;
  label: string;
  value: string;
  options: DropdownOption[];
  disabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find(option => option.id === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    rootRef.current?.querySelector<HTMLButtonElement>('[role="option"][aria-selected="true"]')?.focus();
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (!open) { setOpen(true); return; }
    const items = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') || []);
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next].focus();
  }

  return <div className={`dropdown${open ? ' is-open' : ''}`} ref={rootRef} onKeyDown={handleKeyDown}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}>
    <button id={id} ref={triggerRef} className="dropdown-trigger" type="button" disabled={disabled}
      aria-labelledby={`${id}-label ${id}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`}
      onClick={() => setOpen(current => !current)}>
      <span className="dropdown-value">{selected?.label || placeholder}</span>
      <span className="dropdown-chevron" aria-hidden="true"><svg viewBox="0 0 20 20" fill="none"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
    </button>
    {open && <div id={`${id}-options`} className="dropdown-menu" role="listbox" aria-label={label}>
      {options.map(option => <button key={option.id} type="button" role="option" aria-selected={option.id === value}
        className="dropdown-option" onClick={() => { onChange(option.id); setOpen(false); triggerRef.current?.focus(); }}>
        <span><strong>{option.label}</strong><small>{option.detail}</small></span>
        {option.id === value && <span className="dropdown-check" aria-hidden="true">✓</span>}
      </button>)}
    </div>}
  </div>;
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
                <div className="field"><span id="city-label">Ваш город</span><Dropdown id="city" label="Ваш город" value={cityId} disabled={!catalog} placeholder="Выберите город" options={catalog?.cities.map(city => ({ id: city.id, label: city.name, detail: `Выезд ${money(city.visitFeeRub)}` })) || []} onChange={value => { setCityId(value); setQuote(null); }} /><small>Выезд мастера: {selectedCity ? money(selectedCity.visitFeeRub) : '—'}</small></div>
                <div className="field"><span id="service-label">Тип услуги</span><Dropdown id="service" label="Тип услуги" value={serviceId} disabled={!catalog} placeholder="Выберите услугу" options={catalog?.services.map(service => ({ id: service.id, label: service.name, detail: `От ${money(service.basePriceRub)} · ${service.durationMin} мин` })) || []} onChange={value => { setServiceId(value); setQuote(null); }} /><small>{selectedService?.description || 'Загрузка услуг...'}</small></div>
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
      <footer id="about"><div><a className="brand footer-brand" href="#top"><span className="brand-mark">м<span>↗</span></span><span>мастер<span className="brand-dot">.</span>рядом</span></a><p>Демонстрационный проект. Реальные заказы не принимаются.</p></div><div className="footer-right">React · API · SQLite <span>© 2026</span></div></footer>
    </div>
  </>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
