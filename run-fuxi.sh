#!/usr/bin/env bash

# Wrapper script to run fuxi-cli without deprecation warnings
NODE_OPTIONS='--no-deprecation' node "$(dirname "$0")/bundle/fuxi-cli.js" "$@"
