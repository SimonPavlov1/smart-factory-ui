# Разработка, тестирование и эксплуатация

Инструкция для рабочего сервера: [Развёртывание в локальной сети](DEPLOYMENT_LAN.md).

## Структура

```text
smart-factory-ui/
  src/App.jsx                 основной экран и задачи
  src/components/             функциональные разделы
  src/app2.css                дизайн-система CRM
  docs/                       пользовательская и техническая документация

smart-factory-mes/
  app/api/                    FastAPI-маршруты
  app/models/                 SQLAlchemy-модели
  app/schemas/                Pydantic-схемы
  app/services/               бизнес-логика
  alembic/versions/           миграции
  tests/                      производственные сценарии
```

## Локальный запуск

Backend:

```bash
cd smart-factory-mes
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd smart-factory-ui
npm install
npm run dev
```

Swagger доступен по адресу `http://127.0.0.1:8000/docs`.

## Переменные окружения

| Переменная | Назначение | Локальное значение по умолчанию |
|---|---|---|
| `AUTH_SECRET_KEY` | Подпись токенов | `dev-secret-change-me` |
| `AUTH_TOKEN_TTL_HOURS` | Время сессии | `12` |
| `DEFAULT_ADMIN_USERNAME` | Первый администратор | `admin` |
| `DEFAULT_ADMIN_PASSWORD` | Пароль первого администратора | `admin123` |

Для production обязательно задайте собственные `AUTH_SECRET_KEY` и `DEFAULT_ADMIN_PASSWORD`.

## База данных

Локально используется `smart-factory-mes/sql_app.db`. Файл, резервные копии, вложения и runtime-данные исключены из Git.

Изменение схемы:

```bash
alembic revision -m "описание изменения"
alembic upgrade head
```

Не используйте `init_db.py` на рабочей базе: скрипт выполняет `drop_all` и удаляет данные.

Перед опасной операцией допустима резервная копия вне репозитория:

```bash
cp sql_app.db ../backups/sql_app-YYYYMMDD-HHMM.db
```

Не храните резервные базы в Git и удаляйте их после окончания срока хранения.

## Тестирование backend

```bash
cd smart-factory-mes
.venv/bin/python -m compileall -q app tests
.venv/bin/python -m unittest discover -s tests -v
```

Набор тестов проверяет:

- заводские номера и параллельную работу сотрудников;
- полный цикл от закупки до готовой продукции;
- частичное наличие компонентов;
- предсборочное тестирование;
- дефект, ремонт и повторный тест;
- частичную упаковку и оприходование;
- защиту от повторной обработки;
- отмену заявки и освобождение резервов;
- ручные задачи, зависимости и события.

## Тестирование frontend

```bash
cd smart-factory-ui
npm test
npm audit --omit=dev
```

`npm test` выполняет ESLint и production build. После изменения PDF-отчётов дополнительно проверьте скачивание ведомости вручную: jsPDF загружается отдельным динамическим chunk.

## Правила изменений

- автоматический производственный переход реализуется в `workflow_service.py`;
- допустимые связи этапов фиксируются в `workflow_routes.py`;
- действия должны быть идемпотентны: повторный запрос не меняет остаток второй раз;
- операции выполняются по конкретным заводским номерам;
- ветки разных изделий одного заказа не должны блокировать друг друга;
- любое изменение количества компонентов должно создавать `InventoryMovement`;
- изменение схемы сопровождается Alembic-миграцией и тестом;
- новые UI-действия должны быть доступны с клавиатуры и иметь `aria-label` для кнопок без текста.

## Контроль перед коммитом

```bash
# Backend
.venv/bin/python -m unittest discover -s tests

# Frontend
npm test
npm audit --omit=dev

# Оба репозитория
git diff --check
git status --short
```
