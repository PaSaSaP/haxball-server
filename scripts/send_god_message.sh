#!/bin/bash

if [[ $# -lt 2 ]]; then
    echo "Put selector_subselector as first param and message..."
    echo "Example: 3vs3_1 !w @user make sth"
    echo "Example: 1vs1_2 !anno Happy New Year"
    exit 1
fi

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
DDIR="$SCRIPT_DIR/../dynamic"

SELECTOR="$1"
if ! [[ "$SELECTOR" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Invalid selector $SELECTOR"
    exit 1
fi

F="$DDIR/god_commander_${SELECTOR}.txt"
shift
echo "GOD,$@" >>$F
echo "Sent given msg to $SELECTOR: $@"

