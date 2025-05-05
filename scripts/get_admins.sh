#!/bin/bash

DB_FILE="$1"          # Baza danych

# Sprawdzamy, czy podano wszystkie argumenty
if [ -z "$DB_FILE" ] ; then
  echo "Usage: $0 <db_file>"
  exit 1
fi

sqlite3 "$DB_FILE" <<EOF
  SELECT pb.auth_id, pn.name, pb.admin_level
  FROM players pb
  JOIN player_names pn ON pb.auth_id = pn.auth_id
  WHERE pb.admin_level > 0
  ORDER BY pb.admin_level DESC;
EOF
