#!/bin/bash

DB_FILE="$1"          # Baza danych
shift
AUTH_IDS="$@"           # auth_id

# Sprawdzamy, czy podano wszystkie argumenty
if [ -z "$DB_FILE" ] || [ -z "$AUTH_IDS" ]; then
  echo "Usage: $0 <db_file> <auth_id>"
  exit 1
fi

BY='SCRIPT_UPDATE_________________SCRIPT_UPDATE'
for AUTH_ID in $AUTH_IDS; do
  # Zaktualizuj poziom admina w tabeli players
  sqlite3 "$DB_FILE" <<EOF
    UPDATE players
    SET
      trusted_level = 0,
      trusted_by = '$BY'
    WHERE auth_id = '$AUTH_ID';
EOF
  # Sprawdzamy, czy zapytanie zakończyło się powodzeniem
  if [ $? -eq 0 ]; then
    echo "Trust level updated successfully."
  else
    echo "Error: Failed to update trust_level."
  fi
done
