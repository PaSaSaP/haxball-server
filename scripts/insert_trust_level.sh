#!/bin/bash

DB_FILE="$1"          # Baza danych
AUTH_ID="$2"           # auth_id
NEW_TRUST_LEVEL="$3"   # nowy poziom zaufania

# Sprawdzamy, czy podano wszystkie argumenty
if [ -z "$DB_FILE" ] || [ -z "$AUTH_ID" ] || [ -z "$NEW_TRUST_LEVEL" ]; then
  echo "Usage: $0 <db_file> <auth_id> <new_trust_level>"
  exit 1
fi

BY='SCRIPT_INSERT_________________SCRIPT_INSERT'
# Zaktualizuj poziom admina w tabeli players
sqlite3 "$DB_FILE" <<EOF
  INSERT INTO players
  (auth_id, trusted_by, trusted_level)
  VALUES ('$AUTH_ID', '$BY', $NEW_TRUST_LEVEL);
EOF

# Sprawdzamy, czy zapytanie zakończyło się powodzeniem
if [ $? -eq 0 ]; then
  echo "Trust level inserted successfully."
else
  echo "Error: Failed to insert trust_level."
fi

