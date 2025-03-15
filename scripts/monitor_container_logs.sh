#!/bin/bash

if [[ $# < 1 ]]; then
    echo "give container name as parameter..."
    exit 1
fi

ONCE=false
if [[ "$1" == "-1" ]]; then
    ONCE=true
    shift 1
fi

C="$1"
shift 1
ARGS="-f --since 1m"
if [[ $# -gt 0 ]]; then
    ARGS="$@"
fi

container_state() {
    docker inspect -f '{{.State.Running}}' "$1"
}

while true; do
    sleep 1;
    if [[ $# -eq 0 && "$(container_state "$C")" == "false" ]]; then
        continue; # container stopped so do not try to monitor logs
    fi
    echo "RESTART KONTENERA, LOOOOOGI"
    docker logs "$C" $ARGS
    if "$ONCE"; then
        break
    fi
done
