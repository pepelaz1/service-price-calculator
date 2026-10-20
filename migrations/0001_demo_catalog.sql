CREATE TABLE cities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  coefficient_bp INTEGER NOT NULL CHECK (coefficient_bp BETWEEN 8000 AND 15000),
  visit_fee_rub INTEGER NOT NULL CHECK (visit_fee_rub >= 0)
) STRICT;

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  base_price_rub INTEGER NOT NULL CHECK (base_price_rub > 0),
  duration_min INTEGER NOT NULL CHECK (duration_min > 0)
) STRICT;

INSERT INTO cities VALUES
  ('tomsk', 'Томск', 10000, 350),
  ('novosibirsk', 'Новосибирск', 10800, 450),
  ('kazan', 'Казань', 11200, 500),
  ('spb', 'Санкт-Петербург', 12500, 650),
  ('moscow', 'Москва', 13500, 750);

INSERT INTO services VALUES
  ('diagnostics', 'Диагностика', 'Диагностика устройства', 'Выявим причину неисправности и предложим решение.', 900, 45),
  ('laptop-clean', 'Ноутбуки', 'Чистка ноутбука', 'Удаление пыли и замена термопасты.', 1800, 90),
  ('windows-setup', 'Компьютеры', 'Настройка системы', 'Настройка ОС, драйверов и базовых программ.', 1500, 75),
  ('data-recovery', 'Данные', 'Восстановление файлов', 'Поиск и восстановление данных после сбоя.', 2600, 120),
  ('wifi-setup', 'Сеть', 'Настройка Wi‑Fi', 'Подключение роутера и устройств к домашней сети.', 1300, 60);
