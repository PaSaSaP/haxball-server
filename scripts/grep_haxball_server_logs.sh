#!/bin/bash
# scripts/grep_haxball_server_logs.sh 3h "#MONITORING#"|grep -v -w -e handleGameStart -e "CMD start for" -e "BOT zapisałem pliki"

SINCE="$1"
shift 1
WHAT="$@"

if [[ -z $SINCE || -z $WHAT ]]; then
    echo "pass args: $0 <since> <what...>"
    echo "example: $0 3h troll"
    exit 1
fi

for c in haxball-server-futsal-3vs3-1 haxball-server-futsal-1vs1 haxball-server-volleyball haxball-server-handball; do
    echo "Checking container: $c"
    docker logs "$c" --since "$SINCE" 2>/dev/null | grep -i -e $WHAT
done

