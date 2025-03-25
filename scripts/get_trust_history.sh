#!/bin/bash

DB_FILE="$1"
AUTH_ID="$2"

# Sprawdzamy, czy podano wszystkie argumenty
if [[ -z "$DB_FILE" ]]; then
  echo "Usage: $0 <db_file> [auth_id]"
  exit 1
fi

WHERE_CLAUSE=''
if [[ -n $AUTH_ID ]]; then
  WHERE_CLAUSE="WHERE auth_id='$AUTH_ID'"
fi

sqlite3 "$DB_FILE" <<EOF
  SELECT * FROM history_players_trust
  $WHERE_CLAUSE;
EOF
