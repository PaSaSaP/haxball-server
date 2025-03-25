#!/bin/bash

DB_FILE="$1"
AUTH_ID="$2"

# Sprawdzamy, czy podano wszystkie argumenty
if [[ -z "$DB_FILE" ]] || [[ -z "$AUTH_ID" ]]; then
  echo "Usage: $0 <db_file> <auth_id>"
  exit 1
fi

sqlite3 "$DB_FILE" <<EOF
  SELECT * FROM history_players_trust
  WHERE auth_id = '$auth_id';
EOF
