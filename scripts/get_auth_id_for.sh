#!/bin/bash

DB_FILE="$1"
PLAYER_NAME="$2"

# Sprawdzamy, czy podano wszystkie argumenty
if [[ -z "$DB_FILE" ]] || [[ -z "$PLAYER_NAME" ]]; then
  echo "Usage: $0 <db_file> <player_name>"
  exit 1
fi

# Zaktualizuj poziom admina w tabeli players
sqlite3 "$DB_FILE" <<EOF
  SELECT * FROM player_names
  WHERE name = '$PLAYER_NAME';
EOF

