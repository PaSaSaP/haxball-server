#!/bin/bash

DB_FILE="$1"
AUTH_ID="$2"

if [[ -z "$DB_FILE" ]] || [[ -z "$AUTH_ID" ]]; then
  echo "Usage: $0 <db_file> <auth_id>"
  exit 1
fi

sqlite3 "$DB_FILE" <<EOF
  SELECT * FROM player_names
  WHERE auth_id = '$AUTH_ID';
EOF

