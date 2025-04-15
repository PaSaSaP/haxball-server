#!/bin/bash
# add it to cron
# when container is recreated, start below script by hand once to setup authorized_keys on remote

SCRIPT_DIR="$(dirname "$(realpath "$0")")"

C="puppeteer_ssh-proxy_1"
STATE=$(docker inspect -f '{{.State.Running}}' "$C")
if [[ "$STATE" != "true" ]]; then
  echo "ssh proxy container $S is not running..."
  exit 1;
fi

if ! docker exec "$C" pidof ssh >/dev/null; then
  echo "Starting SSH because of it is not running..."
  /home/ubuntu/bin/tunnel_vps_mitm_from_container.sh
  exit 0
fi
