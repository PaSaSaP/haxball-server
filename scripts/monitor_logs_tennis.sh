#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
C="haxball-server-tennis$1"
shift 1
"$SCRIPT_DIR/monitor_container_logs.sh" "$C" "$@"
