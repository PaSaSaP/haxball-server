#!/bin/bash

LOWERCASE=false
LOWERCASE_ARG=
if [[ $1 = "-l" ]]; then
  LOWERCASE=true
  LOWERCASE_ARG="-l"
  shift 1
fi

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
DB_FILE="$1"
PLAYER_NAME="$2"

# Sprawdzamy, czy podano wszystkie argumenty
if [[ -z "$DB_FILE" ]] || [[ -z "$PLAYER_NAME" ]]; then
  echo "Usage: $0 <db_file> <player_name>"
  exit 1
fi

AUTH_IDS=$("$SCRIPT_DIR/get_auth_id_for.sh" $LOWERCASE_ARG "$DB_FILE" "$PLAYER_NAME"|cut -d\| -f2)
for auth_id in $AUTH_IDS; do
  echo "## checking auth $auth_id"
  "$SCRIPT_DIR/get_player_names_for.sh" "$DB_FILE" "$auth_id"
done
