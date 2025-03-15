#!/bin/bash

while true; do 
	echo "RESTART KONTENERA, LOOOOOGI"
	docker logs haxball-server-futsal-3vs3-1 -f --since 1m
	sleep 1
done
