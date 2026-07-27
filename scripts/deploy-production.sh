#!/usr/bin/env bash

set -Eeuo pipefail

INSTALL_DIR="/opt/smart-factory"
UI_DIR="${INSTALL_DIR}/smart-factory-ui"
BACKEND_DIR="${INSTALL_DIR}/smart-factory-mes"
BACKUP_DIR="/srv/backups/smart-factory"
UI_REPOSITORY="https://github.com/SimonPavlov1/smart-factory-ui.git"
BACKEND_REPOSITORY="https://github.com/SimonPavlov1/smart-factory-mes.git"

on_error() {
  echo "ОШИБКА: деплой остановлен на строке ${1}. Предыдущие данные PostgreSQL не удалялись." >&2
}
trap 'on_error "$LINENO"' ERR

echo "=== 1. Системные зависимости ==="
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 git openssl curl
sudo systemctl enable --now docker

echo "=== 2. Репозитории ==="
sudo mkdir -p "$INSTALL_DIR"
sudo chown "$USER":"$USER" "$INSTALL_DIR"

if [ ! -d "${UI_DIR}/.git" ]; then
  git clone "$UI_REPOSITORY" "$UI_DIR"
fi
if [ ! -d "${BACKEND_DIR}/.git" ]; then
  git clone "$BACKEND_REPOSITORY" "$BACKEND_DIR"
fi

cd "$UI_DIR"

echo "=== 3. Секреты ==="
if [ ! -f .env ]; then
  cp .env.example .env
  database_password="$(openssl rand -hex 24)"
  auth_secret="$(openssl rand -hex 48)"
  admin_password="$(openssl rand -hex 16)"
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${database_password}|" .env
  sed -i "s|^AUTH_SECRET_KEY=.*|AUTH_SECRET_KEY=${auth_secret}|" .env
  sed -i "s|^DEFAULT_ADMIN_PASSWORD=.*|DEFAULT_ADMIN_PASSWORD=${admin_password}|" .env
  chmod 600 .env
  printf '%s\n' "$admin_password" > "${INSTALL_DIR}/initial-admin-password.txt"
  chmod 600 "${INSTALL_DIR}/initial-admin-password.txt"
  echo "Создан .env. Начальный пароль администратора сохранён в:"
  echo "${INSTALL_DIR}/initial-admin-password.txt"
fi

if grep -Eq '=(CHANGE_ME[^[:space:]]*|)[[:space:]]*$' .env; then
  echo "В .env осталось пустое значение или CHANGE_ME. Исправьте файл перед production-запуском." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

echo "=== 4. Резервная копия существующей PostgreSQL ==="
sudo mkdir -p "$BACKUP_DIR"
sudo chown "$USER":"$USER" "$BACKUP_DIR"

# Поднимаем только PostgreSQL на текущей версии compose. Это также находит
# существующий volume после обычного `docker compose down`.
sudo docker compose up -d database
database_container="$(sudo docker compose ps -q database)"
for _ in $(seq 1 60); do
  health="$(sudo docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$database_container")"
  [ "$health" = "healthy" ] && break
  [ "$health" = "unhealthy" ] && exit 1
  sleep 2
done
test "$(sudo docker inspect -f '{{.State.Health.Status}}' "$database_container")" = "healthy"

backup_file="${BACKUP_DIR}/database-before-deploy-$(date +%Y%m%d-%H%M%S).dump"
sudo docker compose exec -T database \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$backup_file"
test -s "$backup_file"
echo "Резервная копия создана: $backup_file"

echo "=== 5. Получение обновлений ==="
git -C "$UI_DIR" pull --ff-only
git -C "$BACKEND_DIR" pull --ff-only

echo "=== 6. Проверка и сборка контейнеров ==="
cd "$UI_DIR"
sudo docker compose config >/dev/null
sudo docker compose build backend frontend

echo "=== 7. Запуск PostgreSQL ==="
sudo docker compose up -d database
database_container="$(sudo docker compose ps -q database)"
for _ in $(seq 1 60); do
  health="$(sudo docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$database_container")"
  if [ "$health" = "healthy" ]; then
    break
  fi
  if [ "$health" = "unhealthy" ]; then
    sudo docker compose logs --tail=100 database
    exit 1
  fi
  sleep 2
done
test "$(sudo docker inspect -f '{{.State.Health.Status}}' "$database_container")" = "healthy"

echo "=== 8. Backup схемы и миграции ==="
sudo docker compose run --rm backend python -m app.prestart

echo "=== 9. Запуск приложения ==="
sudo docker compose up -d --remove-orphans
sudo docker compose ps

backend_container="$(sudo docker compose ps -q backend)"
frontend_container="$(sudo docker compose ps -q frontend)"
test -n "$backend_container"
test -n "$frontend_container"

for _ in $(seq 1 60); do
  backend_health="$(sudo docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$backend_container")"
  if [ "$backend_health" = "healthy" ]; then
    break
  fi
  if [ "$backend_health" = "unhealthy" ]; then
    sudo docker compose logs --tail=150 backend
    exit 1
  fi
  sleep 2
done
test "$(sudo docker inspect -f '{{.State.Health.Status}}' "$backend_container")" = "healthy"

curl --fail --silent --show-error "http://${BIND_ADDRESS:-127.0.0.1}:${APP_PORT:-80}/" >/dev/null
curl --fail --silent --show-error "http://${BIND_ADDRESS:-127.0.0.1}:${APP_PORT:-80}/api/" >/dev/null

echo "=== Деплой успешно завершён ==="
echo "Backup-каталог: $BACKUP_DIR"
echo "Не используйте 'docker compose down -v': эта команда удаляет данные."
