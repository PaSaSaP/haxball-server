#!/bin/bash

FILE="data/retrusting.txt"
DB_DIR="./db"
MAIN_DB="$DB_DIR/main_futsal_players.db"
V1_DB="$DB_DIR/other_futsal_1vs1.db"
V3_DB="$DB_DIR/other_futsal_3vs3.db"
V4_DB="$DB_DIR/other_futsal_4vs4.db"

if [[ ! -e $FILE ]]; then
  echo "$FILE does not exist..."
  exit 1
fi

make_sql() {
  F="$1"
  shift 1
  sqlite3 "$F" <<<"$@"
}
make_sql_main() {
  make_sql "$MAIN_DB" "$@"
}
make_sql_v1() {
  make_sql "$V1_DB" "$@"
}
make_sql_v3() {
  make_sql "$V3_DB" "$@"
}
make_sql_v4() {
  make_sql "$V4_DB" "$@"
}

NOW=$(date +"%s")
while IFS="|" read -r auth_id _; do
  # echo "$auth_id"
  bot_info=$(make_sql_main "SELECT * FROM probable_bots WHERE auth_id='$auth_id';")
  # echo "bot info $bot_info"
  player_names_info=$(make_sql_main "SELECT * FROM player_names WHERE auth_id='$auth_id';"|tail -1)
  players_info=$(make_sql_main "SELECT * FROM players WHERE auth_id='$auth_id';")
  players_state_v1_info=$(make_sql_v1 "SELECT * FROM players_state WHERE auth_id='$auth_id';")
  players_state_v3_info=$(make_sql_v3 "SELECT * FROM players_state WHERE auth_id='$auth_id';")
  player_ratings_info=$(make_sql_v3 "SELECT * FROM player_ratings WHERE auth_id='$auth_id';")
  rolling_ratings_info=$(make_sql_v3 "SELECT * FROM rolling_ratings WHERE auth_id='$auth_id' ORDER BY date ASC LIMIT 1;")
  first_match_info=$(make_sql_v3 "SELECT m.* FROM matches m JOIN match_stats ms ON m.match_id = ms.match_id WHERE ms.auth_id='$auth_id' ORDER BY ms.match_id ASC LIMIT 1;")
  player_name=$(cut -d\| -f3 <<<$player_names_info)
  marked_as_bot=$(test -n "$bot_info" && echo 1 || echo 0)
  kicked_to_v1=$(cut -d\| -f2 <<<$players_state_v1_info)
  is_kicked_v1=$(test -n "$kicked_to_v1" && echo 1 || echo 0)
  kicked_to_v3=$(cut -d\| -f2 <<<$players_state_v3_info)
  is_kicked_v3=$(test -n "$kicked_to_v3" && echo 1 || echo 0)
  trust_level=$(cut -d\| -f2 <<<$players_info)
  rating=$(cut -d\| -f2 <<<$player_ratings_info|cut -d\. -f1)
  rolling_rating=$(cut -d\| -f4 <<<$rolling_ratings_info|cut -d\. -f1)
  first_match_date=$(cut -d\| -f2 <<<$first_match_info)
  T="$auth_id $player_name has B:$marked_as_bot T:$trust_level"
  if [[ $is_kicked_v1 = 1 ]]; then
    TT=$(test $kicked_to_v1 -lt $NOW && echo "K" || echo "k")
    TT="${TT}1:$kicked_to_v1"
    T="$T $TT"
  fi
  if [[ $is_kicked_v3 = 1 ]]; then
    TT=$(test $kicked_to_v3 -lt $NOW && echo "K" || echo "k")
    TT="${TT}3:$kicked_to_v3"
    T="$T $TT"
  fi
  T="$T R:$rating RR:$rolling_rating"
  if [[ $trust_level -eq 0 && -n $rolling_rating ]]; then
    T="$T PQ=1,$first_match_date"
  fi
  if [[ -n $rolling_rating && $rating -ne $rolling_rating ]]; then
    T="$T PQ=2"
  fi
  echo "$T"

  # if [[ $first_match_date -lt 2025-03-18 ]]; then
    # continue;
  # fi
  # if [[ $trust_level -eq 0 && -n $rolling_rating ]]; then
    # echo "$T"
    # make_sql_main "DELETE FROM probable_bots WHERE auth_id='$auth_id';"
    # make_sql_main "UPDATE players SET trusted_level=1 WHERE auth_id='$auth_id' AND trusted_by='QxkI4PJuA0LOT0krfPdtAgPojFw_nCXWP8qL0Aw0dGc';"
  # fi
  # break
done < "$FILE"

