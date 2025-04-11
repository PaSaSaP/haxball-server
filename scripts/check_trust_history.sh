#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
MAIN_DB="./db/main_futsal_players.db"

check_auth_id() {
  auth_id="$1"
  echo "checking auth_id: $auth_id"
  "$SCRIPT_DIR/get_player_info.sh" "$MAIN_DB" "$auth_id"
  echo "History below"
  "$SCRIPT_DIR/get_trust_history.sh" "$MAIN_DB" "$auth_id"
}

if [[ "$1" = "-a" ]]; then
  AUTH_ID="$2"
  if [[ -z "$AUTH_ID" ]]; then
    echo "put auth_id as argument..."
    exit 1
  fi
  for AUTH_ID in "$@"; do
    check_auth_id "$AUTH_ID"
  done
  exit 0
fi

NICK=$1
if [[ -z $NICK ]]; then
  echo "pass nick as argument..."
  exit 1
fi

for NICK in "$@"; do
    AUTH_IDS=$("$SCRIPT_DIR/get_auth_id_for.sh" -l "$MAIN_DB" "$NICK" |cut -d\| -f2)

    for auth_id in ${AUTH_IDS}; do
      check_auth_id "$auth_id"
    done
done

