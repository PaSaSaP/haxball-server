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
  WHERE_CLAUSE="WHERE p.auth_id='$AUTH_ID'"
fi

sqlite3 "$DB_FILE" <<EOF
  SELECT
    p.auth_id,
    pn.name,
    p.trusted_level,
    p.trusted_by,
    pn2.name AS trusted_by_name,
    p.timestamp
  FROM
    history_players_trust p
  LEFT JOIN
    player_names pn ON p.auth_id = pn.auth_id
  LEFT JOIN
    player_names pn2 ON p.trusted_by = pn2.auth_id
  $WHERE_CLAUSE;
EOF
