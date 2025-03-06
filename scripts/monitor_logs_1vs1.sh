#!/bin/bash

while true; do 
	echo "RESTART KONTENERA, LOOOOOGI"
	docker logs haxball-server-futsal-1vs1 -f --since 1m
	sleep 1
done
