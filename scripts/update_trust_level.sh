#!/bin/bash

DB_FILE="$1"          # Baza danych
AUTH_ID="$2"           # auth_id
NEW_TRUST_LEVEL="$3"   # nowy poziom zaufania

# Sprawdzamy, czy podano wszystkie argumenty
if [ -z "$DB_FILE" ] || [ -z "$AUTH_ID" ] || [ -z "$NEW_TRUST_LEVEL" ]; then
  echo "Usage: $0 <db_file> <auth_id> <new_trust_level>"
  exit 1
fi

# Zaktualizuj poziom admina w tabeli players
sqlite3 "$DB_FILE" <<EOF
  UPDATE players
  SET trusted_level = $NEW_TRUST_LEVEL
  WHERE auth_id = '$AUTH_ID';
EOF

# Sprawdzamy, czy zapytanie zakończyło się powodzeniem
if [ $? -eq 0 ]; then
  echo "Trust level updated successfully."
else
  echo "Error: Failed to update trust_level."
fi

