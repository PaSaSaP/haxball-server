#!/bin/bash

DB_FILE="$1"

# Sprawdzamy, czy podano wszystkie argumenty
if [[ -z "$DB_FILE" ]]; then
  echo "Usage: $0 <db_file>"
  exit 1
fi

sqlite3 "$DB_FILE" <<EOF
  DELETE FROM servers;
EOF

