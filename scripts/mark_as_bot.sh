#!/bin/bash

DB_FILE="$1"
AUTH_ID="$2"
CONN_ID="$3"

# Sprawdzamy, czy podano wszystkie argumenty
if [ -z "$DB_FILE" ] || [ -z "$AUTH_ID" ] || [ -z "$CONN_ID" ] ; then
  echo "Usage: $0 <db_file> <auth_id> <conn_id>"
  exit 1
fi

# Zaktualizuj poziom admina w tabeli players
sqlite3 "$DB_FILE" <<EOF
  INSERT INTO probable_bots (auth_id, conn_id, at)
  VALUES ('$AUTH_ID', '$CONN_ID', CURRENT_TIMESTAMP);
EOF

# Sprawdzamy, czy zapytanie zakończyło się powodzeniem
if [ $? -eq 0 ]; then
  echo "Player bot state set to 1"
else
  echo "Error: Failed to set bot state."
fi

