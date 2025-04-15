#!/bin/bash

SCRIPT_DIR="$(dirname "$(realpath "$0")")"

for selector in "futsal-3vs3-1" "futsal-1vs1" "volleyball" "handball"; do
    c="haxball-server-$selector"
    ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$c")
    ipv6=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}' "$c")
    echo "Container $c with IP: $ip IPv6: ${ipv6}"
    sudo conntrack -L -p udp --src "$ip"
    sudo conntrack -L -p udp --src "$ipv6"
done

