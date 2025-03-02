#!/bin/bash
# run as scripts/run_host.sh

export HTTP_PROXY=http://127.0.0.1:3128 HTTPS_PROXY=http://127.0.0.1:3128

# TODO change below to something little more secure
export NODE_TLS_REJECT_UNAUTHORIZED='0'
npm start

