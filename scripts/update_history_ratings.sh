#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"

set -e
D=$(date -d "yesterday" +"%Y-%m-%d")
cd "$SCRIPT_DIR/.."
echo "update history stats and hall of fame for $D"
for selector in 3vs3 4vs4; do
    HX_SELECTOR="$selector" ts-node accu_stats/history_accu_stats.ts "$D" https://haxball.ovh
done
