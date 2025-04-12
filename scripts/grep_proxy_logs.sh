#!/bin/bash

C=$1
if [[ -z $C ]]; then
    echo "pass 1vs1 or 3vs3 as first param"
    exit 1
fi
shift 1
T="$@"
if [[ -z $% ]]; then
    echo "pass grep args as second and so params"
    exit 1
fi
docker exec proxy-futsal-"$C" grep /tmp/ws_events.log $T

