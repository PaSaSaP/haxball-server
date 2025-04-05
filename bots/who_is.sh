#!/bin/bash

if [[ -n $1 ]]; then
    F=$(ls ./dynamic/inputs/*${1}*)
else
    F=$(ls ./dynamic/inputs/*)
fi
get_auths() {
  for f in ${F}; do
      if [[ ! -f $f ]]; then
          continue
      fi
      b=$(basename "$f")
      # echo "checking $b"
      auth=${b#*-*-*-*-*-*-*-*-}
      auth=${auth%-*}
      echo "$auth"
  done
}

AUTHS=$(get_auths)
UNIQ=$(sort <<<$AUTHS | uniq -c)
while read count auth; do
  pname=$(scripts/get_player_names_for.sh db/main_futsal_players.db "$auth"|cut -d\| -f3|tr '\n' '|')
  echo "Liczba: $count, auth: $auth => $pname"
done <<< "$UNIQ"
