#!/bin/bash

LOWERCASE=false
if [[ $1 = "-l" ]]; then
  LOWERCASE=true
  shift 1
fi

DB_FILE="$1"
PLAYER_NAME="$2"

# Sprawdzamy, czy podano wszystkie argumenty
if [[ -z "$DB_FILE" ]] || [[ -z "$PLAYER_NAME" ]]; then
  echo "Usage: $0 <db_file> <player_name>"
  exit 1
fi

NAME_CONDITION="name"
if [[ "$LOWERCASE" = "true" ]]; then
  NAME_CONDITION="LOWER(name)"
  PLAYER_NAME=${PLAYER_NAME,,}
fi

# Zaktualizuj poziom admina w tabeli players
sqlite3 "$DB_FILE" <<EOF
  SELECT * FROM player_names
  WHERE $NAME_CONDITION = '$PLAYER_NAME';
EOF
