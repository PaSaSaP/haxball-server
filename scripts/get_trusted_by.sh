#!/bin/bash

DB_FILE="$1"
TRUSTED_BY="$2"

# Sprawdzamy, czy podano wszystkie argumenty
if [[ -z "$DB_FILE" ]] || [[ -z "$TRUSTED_BY" ]]; then
  echo "Usage: $0 <db_file> <player_name>"
  exit 1
fi

sqlite3 "$DB_FILE" <<EOF
  SELECT p.auth_id, pn.name, p.trusted_level, p.trusted_by, pn2.name AS trusted_by_name FROM players p
  LEFT JOIN player_names pn ON p.auth_id = pn.auth_id
  LEFT JOIN player_names pn2 ON p.trusted_by = pn2.auth_id
  WHERE p.trusted_by = '$TRUSTED_BY';
EOF

