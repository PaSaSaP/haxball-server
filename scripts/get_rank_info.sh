#!/bin/bash

LOWERCASE=false
LOWERCASE_ARG=
if [[ $1 = "-l" ]]; then
  LOWERCASE=true
  LOWERCASE_ARG="-l"
  shift 1
fi

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
DB_FILE="$1"  #other DB
shift 1
AUTH_ID="$@"

# Sprawdzamy, czy podano wszystkie argumenty
if [[ -z "$DB_FILE" ]] || [[ -z "$AUTH_ID" ]]; then
  echo "Usage: $0 <db_file> <auth_id>"
  exit 1
fi

AUTH_IDS="$AUTH_ID"

for auth_id in $AUTH_IDS; do
  echo "## checking auth $auth_id - below matches"
  sqlite3 "$DB_FILE" <<EOF
    SELECT
      ms.match_id,
      m.date,
      ms.auth_id,
      ms.team,
      ms.goals,
      ms.assists,
      ms.own_goals,
      ms.clean_sheet,
      ms.playtime,
      ms.full_time,
      ms.left_state
    FROM
      match_stats ms
    JOIN
      matches m ON ms.match_id = m.match_id
    WHERE auth_id = '$auth_id';
EOF
  echo "And rolling rating"
  sqlite3 "$DB_FILE" <<EOF
  SELECT *
  FROM
    rolling_ratings
  WHERE auth_id = '$auth_id';
EOF
done
