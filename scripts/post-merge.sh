#!/bin/bash
set -e
node "$(dirname "$0")/post-merge.mjs"
