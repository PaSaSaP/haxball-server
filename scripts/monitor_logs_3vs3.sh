#!/bin/bash

while true; do 
	echo "RESTART KONTENERA, LOOOOOGI"
	docker logs haxball-server-3vs3 -f --since 1m
	sleep 1
done
