#!/bin/bash

DB_FILE="$1"          # Baza danych
AUTH_ID="$2"           # auth_id

# Sprawdzamy, czy podano wszystkie argumenty
if [ -z "$DB_FILE" ] || [ -z "$AUTH_ID" ] ; then
  echo "Usage: $0 <db_file> <auth_id>"
  exit 1
fi

# Zaktualizuj poziom admina w tabeli players
sqlite3 "$DB_FILE" <<EOF
  DELETE FROM  probable_bots
  WHERE auth_id = "$AUTH_ID";
EOF

# Sprawdzamy, czy zapytanie zakończyło się powodzeniem
if [ $? -eq 0 ]; then
  echo "Player bot removed"
else
  echo "Error: Failed to remove bot."
fi

