#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
DDIR="$SCRIPT_DIR/../dynamic/"

container_state() {
    docker inspect -f '{{.State.Running}}' "$1"
}

check() {
    SELECTOR="$1"
    SERVER_FILE="$DDIR/server_active_${SELECOR}.txt"
    CONTAINER="haxball-server-futsal-${SELECTOR/_/-}"
    COUNTERS="$DDIR/current_players_number_${SELECTOR}.csv"
    if [[ -e "$SERVER_FILE" && "$(container_state "$CONTAINER")" == "false" ]]; then
        docker start "$CONTAINER"
        exit 0
    fi
    if [[ ! -e "$SERVER_FILE" && "$(container_state "$CONTAINER")" == "true" ]]; then
        docker stop "$CONTAINER"
        echo "$(date +"%Y-%m-%d,%H:%M:%S"),-1,0" >>$COUNTERS
        exit
    fi
}

# do not scale 3vs3_1 as main server
check "3vs3_2"
check "3vs3_3"
check "4vs4_1"
