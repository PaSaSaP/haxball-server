#!/bin/bash

DB_FILE="$1"          # Baza danych
AUTH_ID="$2"           # auth_id
KICKED_TO="${3:-0}"

# Sprawdzamy, czy podano wszystkie argumenty
if [ -z "$DB_FILE" ] || [ -z "$AUTH_ID" ] ; then
  echo "Usage: $0 <db_file> <auth_id>"
  exit 1
fi

# Zaktualizuj poziom admina w tabeli players
sqlite3 "$DB_FILE" <<EOF
  UPDATE players_state
  SET kicked_to = $KICKED_TO
  WHERE auth_id = "$AUTH_ID";
EOF

# Sprawdzamy, czy zapytanie zakończyło się powodzeniem
if [ $? -eq 0 ]; then
  echo "Player tkick state set to $KICKED_TO"
else
  echo "Error: Failed to reset tkick."
fi

