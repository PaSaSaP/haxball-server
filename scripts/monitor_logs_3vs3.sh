#!/bin/bash

while true; do 
	echo "RESTART KONTENERA, LOOOOOGI"
	docker logs haxball-server -f --since 1m
	sleep 1
done
