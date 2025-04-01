#!/bin/bash

DB_FILE="$1"
AUTH_ID="$2"

if [[ -z "$DB_FILE" ]] || [[ -z "$AUTH_ID" ]]; then
  echo "Usage: $0 <db_file> <auth_id>"
  exit 1
fi

sqlite3 "$DB_FILE" <<EOF
  SELECT
    p.auth_id,
    pn.name,
    p.trusted_level,
    p.trusted_by,
    pn2.name AS trusted_by_name,
    p.admin_level
  FROM
    players p
  LEFT JOIN
    player_names pn ON p.auth_id = pn.auth_id
  LEFT JOIN
    player_names pn2 ON p.trusted_by = pn2.auth_id
  WHERE p.auth_id = '$AUTH_ID';
EOF

<<EOF
SELECT p.auth_id, pn.name, p.trusted_level, pn2.name AS trusted_by_name, p.admin_level FROM players p LEFT JOIN player_names pn ON p.auth_id = pn.auth_id LEFT JOIN player_names pn2 ON p.trusted_by = pn2.auth_id WHERE p.trusted_by = 'QxkI4PJuA0LOT0krfPdtAgPojFw_nCXWP8qL0Aw0dGc' AND p.trusted_level > 0;
EOF
