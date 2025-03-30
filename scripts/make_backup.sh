#!/bin/bash

# Konfiguracja katalogów
SOURCE_DIR="/home/ubuntu/docker/puppeteer/db"
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
OUT_DIR="/home/ubuntu/docker/db_backup"
DAY_DIR="${OUT_DIR}/day"
WEEK_DIR="${OUT_DIR}/week"

# Tworzenie katalogów docelowych, jeśli nie istnieją
mkdir -p "$DAY_DIR" "$WEEK_DIR"

# Data i godzina
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
HOUR=$(date +"%H")

# Tworzenie nowego backupu w katalogu "day"
BACKUP_DIR="${DAY_DIR}/${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

for sselector in "4vs4_1" "3vs3_1" "1vs1_1"; do
  "$SCRIPT_DIR/send_god_message.sh" "$sselector" '!anno Za 5 sekund Lagi, trzymajcie się!'
done
sleep 5

# Wykonanie backupu dla każdej bazy
for db_file in "$SOURCE_DIR"/*.db; do
  if [ -f "$db_file" ]; then
    db_name=$(basename "$db_file" .db)
    taskset -c 1 ionice -c 3 nice -n 10 sqlite3 "$db_file" ".backup '${BACKUP_DIR}/${db_name}.db'"
    echo "Backup wykonany: ${db_name}.db"
    sleep 1
  fi
done

# Aktualizacja linku symbolicznego do najnowszego backupu
ln -sfn "$BACKUP_DIR" "${OUT_DIR}/latest"

echo "Backup zakończony. Pliki zapisane w: $BACKUP_DIR"

# Usuwanie starych backupów w "day" (max 6)
while [ "$(ls -1 "$DAY_DIR" | wc -l)" -gt 6 ]; do
  OLDEST=$(ls -1 "$DAY_DIR" | head -n 1)
  rm -rf "${DAY_DIR}/${OLDEST}"
  echo "Usunięto stary backup z 'day': $OLDEST"
done

if [[ "$HOUR" == "01" || "$HOUR" == "13" ]]; then
  LATEST_BACKUP=$(ls -1t "$DAY_DIR" | head -n 1)

  # Wyciągnięcie daty z nazwy katalogu (przy założeniu, że nazwa to YYYY-MM-DD_HH-MM-SS)
  BACKUP_DATE=$(echo "$LATEST_BACKUP" | cut -d'_' -f1)

  # Sprawdzenie, czy w `week/` jest już backup z tej daty
  WEEK_BACKUP_EXISTS=$(ls -1 "$WEEK_DIR" | grep "^${BACKUP_DATE}" || echo "")

  if [ -d "${DAY_DIR}/${LATEST_BACKUP}" ] && [ -z "$WEEK_BACKUP_EXISTS" ]; then
    cp -r "${DAY_DIR}/${LATEST_BACKUP}" "${WEEK_DIR}/"
    echo "Skopiowano ${LATEST_BACKUP} do 'week/'"
  else
    echo "Backup z ${BACKUP_DATE} już istnieje w 'week/' – pomijam kopiowanie."
  fi
fi

# Usuwanie starych backupów w "week" (max 12)
while [ "$(ls -1 "$WEEK_DIR" | wc -l)" -gt 12 ]; do
  OLDEST=$(ls -1 "$WEEK_DIR" | head -n 1)
  rm -rf "${WEEK_DIR}/${OLDEST}"
  echo "Usunięto stary backup z 'week': $OLDEST"
done
