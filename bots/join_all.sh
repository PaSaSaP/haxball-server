#!/bin/bash

source ~/venv/bin/activate

FORCE=false
if [[ "$1" = "-f" ]]; then
    FORCE=true
    shift 1
fi
if [[ -n $1 ]]; then
    F=$(ls ./dynamic/inputs/*${1}*)
else
    F=$(ls ./dynamic/inputs/*)
fi
for f in ${F}; do
    if [[ ! -f $f ]]; then
        continue
    fi
    b=$(basename "$f")
    echo "checking $b"
    if [[ "$FORCE" = "false" && -e "./bots/merged/$b" ]]; then
        continue
    fi

    auth=${b#*-*-*-*-*-*-*-*-}
    auth=${auth%-*}
    pname=$(scripts/get_player_names_for.sh db/main_futsal_players.db "$auth"|tail -1|cut -d\| -f3)
    echo "processing $b => $pname"
    ./bots/join_data.py "$b" "$pname"
done

