#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
S="Turniej Tenisa Haxballowego już w ten weekend! Sprawdź discord 💬 https://discord.gg/XrtXvMNKZT 💬"
T='!anno'
T="$T $S"

for selector in "3vs3_1" "tennis_1" "volleyball_1" "freestyle_1"; do
    "$SCRIPT_DIR/send_god_message.sh" "$selector" "$T"
done

