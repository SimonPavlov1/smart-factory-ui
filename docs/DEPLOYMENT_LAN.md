# Развёртывание в локальной сети

## Рекомендуемая схема

Самый простой поддерживаемый вариант для предприятия:

- отдельный постоянно включённый компьютер или мини-ПК;
- Ubuntu Server LTS;
- Docker Engine с Compose plugin;
- frontend, backend и PostgreSQL из `docker-compose.yml`;
- один адрес для сотрудников, например `http://192.168.1.50`;
- резервные копии на другой компьютер, NAS или внешний диск.

```text
Компьютеры сотрудников
          │
          │ http://192.168.1.50
          ▼
     Nginx / frontend
          │ /api
          ▼
    FastAPI / backend
          │
          ▼
       PostgreSQL
```

Из локальной сети наружу не нужно открывать или перенаправлять порты роутера.

## Требования к серверу

Для небольшой команды достаточно:

- 4 ядра CPU;
- 8 ГБ RAM;
- SSD от 100 ГБ;
- гигабитная сеть;
- Ubuntu Server LTS;
- источник бесперебойного питания желательно.

Серверу нужен постоянный IP. Удобнее сделать DHCP reservation на роутере по MAC-адресу, например `192.168.1.50`. Не назначайте случайный статический адрес, который входит в DHCP-пул.

## 1. Установка Docker

Установите Docker Engine и Compose plugin из официального репозитория Docker. Актуальная инструкция:

`https://docs.docker.com/engine/install/ubuntu/`

После установки проверьте:

```bash
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo docker compose version
```

Для первого запуска можно использовать `sudo docker ...`. Добавление пользователя в группу `docker` фактически даёт ему административный доступ к серверу, поэтому делайте это только для доверенного администратора.

## 2. Размещение проектов

Оба проекта должны лежать рядом:

```text
/opt/smart-factory/
  smart-factory-ui/
  smart-factory-mes/
```

Пример:

```bash
sudo mkdir -p /opt/smart-factory
sudo chown "$USER":"$USER" /opt/smart-factory
cd /opt/smart-factory

git clone <URL_FRONTEND_REPOSITORY> smart-factory-ui
git clone <URL_BACKEND_REPOSITORY> smart-factory-mes
```

Если Git-сервера нет, перенесите обе папки на сервер через защищённый носитель или `scp`.

## 3. Настройка секретов

```bash
cd /opt/smart-factory/smart-factory-ui
cp .env.example .env
```

Откройте `.env` и замените все `CHANGE_ME`.

Секреты можно сгенерировать:

```bash
openssl rand -hex 32
```

Пример структуры, не копируйте значения буквально:

```dotenv
APP_PORT=80
BIND_ADDRESS=192.168.1.50

POSTGRES_DB=smart_factory
POSTGRES_USER=smart_factory
POSTGRES_PASSWORD=длинный_случайный_пароль

AUTH_SECRET_KEY=случайная_строка_не_короче_64_символов
AUTH_TOKEN_TTL_HOURS=12

DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=другой_надёжный_пароль
```

Для `POSTGRES_PASSWORD` используйте длинный буквенно-цифровой пароль без `@`, `:`, `/`, `#` и пробелов: значение включается в URL подключения.

Файл `.env` исключён из Git. Доступ к нему должен быть только у администратора:

```bash
chmod 600 .env
```

## 4. Первый запуск

```bash
cd /opt/smart-factory/smart-factory-ui
sudo docker compose config
sudo docker compose up -d --build
sudo docker compose ps
```

Все три сервиса должны перейти в состояние `running`/`healthy`.

Проверка с сервера:

```bash
curl http://192.168.1.50/
curl http://192.168.1.50/api/
```

После этого откройте `http://192.168.1.50` с рабочего компьютера и войдите под `DEFAULT_ADMIN_USERNAME` и `DEFAULT_ADMIN_PASSWORD`.

Сразу создайте персональные учётные записи сотрудников. Не используйте общую учётную запись администратора для ежедневной работы.

## 5. Доступ в локальной сети

На роутере:

- закрепите IP сервера;
- не включайте port forwarding на сервер;
- по возможности разрешите доступ только из рабочей VLAN/подсети.

В `docker-compose.yml` наружу публикуется только порт frontend. PostgreSQL и FastAPI доступны лишь во внутренней Docker-сети.

Docker предупреждает, что опубликованные контейнерные порты могут обходить часть правил UFW. Поэтому `BIND_ADDRESS` должен быть именно локальным адресом сервера, а доступ дополнительно ограничивается сетевым оборудованием.

Если нужен красивый адрес, создайте локальную DNS-запись:

```text
projects.company.local → 192.168.1.50
```

Тогда пользователи смогут открывать `http://projects.company.local`.

## 6. Просмотр состояния

```bash
sudo docker compose ps
sudo docker compose logs --tail=200 backend
sudo docker compose logs --tail=200 frontend
sudo docker compose logs --tail=200 database
```

Перезапуск:

```bash
sudo docker compose restart
```

Остановка без удаления данных:

```bash
sudo docker compose down
```

Не выполняйте `docker compose down -v`: ключ `-v` удаляет PostgreSQL и вложения.

## 7. Обновление

Перед обновлением сделайте резервную копию.

```bash
cd /opt/smart-factory/smart-factory-ui
git pull
git -C ../smart-factory-mes pull
sudo docker compose build
sudo docker compose up -d
sudo docker compose ps
```

При наличии новых миграций:

```bash
sudo docker compose run --rm backend alembic upgrade head
```

Проверяйте обновление сначала на копии базы или тестовом сервере.

## 8. Резервное копирование PostgreSQL

Создайте каталог вне репозиториев:

```bash
sudo mkdir -p /srv/backups/smart-factory
sudo chown "$USER":"$USER" /srv/backups/smart-factory
```

Ручная резервная копия:

```bash
cd /opt/smart-factory/smart-factory-ui
set -a
. ./.env
set +a

sudo docker compose exec -T database \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "/srv/backups/smart-factory/database-$(date +%F-%H%M).dump"
```

Проверка файла:

```bash
ls -lh /srv/backups/smart-factory/
```

Храните минимум:

- ежедневные копии за 14 дней;
- еженедельные за 8 недель;
- одну ежемесячную за 12 месяцев.

Копия на том же физическом диске не является полноценной резервной копией. Переносите дампы на NAS или другой сервер и регулярно проверяйте восстановление.

## 9. Восстановление

Восстановление перезаписывает данные. Сначала сохраните текущую базу и остановите backend:

```bash
sudo docker compose stop backend
```

Затем используйте `pg_restore --clean --if-exists` для выбранного dump. Операцию должен выполнять администратор, понимающий последствия.

После восстановления:

```bash
sudo docker compose start backend
sudo docker compose ps
```

## 10. Вложения

Вложения задач хранятся в Docker volume `backend_uploads`. Их нужно копировать отдельно от PostgreSQL. Посмотреть точное имя тома:

```bash
sudo docker volume ls | grep backend_uploads
```

Для долгосрочной эксплуатации рекомендуется ежедневный архив этого тома на тот же внешний backup-ресурс.

## 11. Что не делать

- не запускайте `init_db.py` на рабочем сервере;
- не публикуйте PostgreSQL-порт `5432`;
- не храните `.env` и дампы в Git;
- не используйте стандартный пароль `admin123`;
- не удаляйте Docker volumes при обновлении;
- не выставляйте приложение в интернет без HTTPS, reverse proxy и отдельного security-аудита;
- не считайте RAID заменой резервного копирования.

## План запуска на работе

Практичный порядок:

1. поднять сервер в тестовой подсети;
2. создать несколько тестовых пользователей;
3. пройти один полный производственный заказ;
4. проверить одновременную работу сборщиков и тестировщиков;
5. сделать dump и выполнить тестовое восстановление;
6. закрепить IP/DNS;
7. обучить сотрудников;
8. только после этого переносить реальный учёт.
