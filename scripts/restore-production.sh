#!/usr/bin/env bash

set -Eeuo pipefail

UI_DIR="/opt/smart-factory/smart-factory-ui"
BACKUP_DIR="/srv/backups/smart-factory"
restore_file="${1:-}"

if [ -z "$restore_file" ] || [ ! -f "$restore_file" ]; then
  echo "Использование: $0 /srv/backups/smart-factory/database-before-deploy-YYYYMMDD-HHMMSS.dump" >&2
  exit 1
fi

cd "$UI_DIR"
set -a
# shellcheck disable=SC1091
. ./.env
set +a

echo "Будет восстановлена база из: $restore_file"
echo "Текущая база будет предварительно сохранена."
read -r -p "Введите RESTORE для продолжения: " confirmation
[ "$confirmation" = "RESTORE" ] || exit 1

sudo mkdir -p "$BACKUP_DIR"
sudo chown "$USER":"$USER" "$BACKUP_DIR"
sudo docker compose up -d database

emergency_backup="${BACKUP_DIR}/database-before-restore-$(date +%Y%m%d-%H%M%S).dump"
sudo docker compose exec -T database \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$emergency_backup"
test -s "$emergency_backup"

sudo docker compose stop backend
sudo docker compose exec -T database \
  pg_restore \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges < "$restore_file"

sudo docker compose run --rm backend python -m app.prestart
sudo docker compose up -d backend frontend
sudo docker compose ps

echo "Восстановление завершено."
echo "Страховочная копия прежнего состояния: $emergency_backup"
