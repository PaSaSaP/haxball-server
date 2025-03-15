#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DDIR="$SCRIPT_DIR/../dynamic/"

container_state() {
    docker inspect -f '{{.State.Running}}' "$1"
}

check() {
    F="$1"
    DF="$DDIR/$F"
    S="$2"
    if [[ -e "$DF" && "$(container_state "$S")" == "false" ]]; then
        docker start "$S"
        exit 0
    fi
    if [[ ! -e "$DF" && "$(container_state "$S")" == "true" ]]; then
        docker stop "$S"
        exit
    fi
}

check "server_active_3vs3_2.txt" "haxball-server-futsal-3vs3-2"
check "server_active_3vs3_3.txt" "haxball-server-futsal-3vs3-3"

