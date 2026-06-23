#!/usr/bin/env bash

# Antigravity CLI Duplicate-Command Guard
# Refuses to run if the command arguments are identical to the last execution.
# Bypass with --force as the first argument.

STATE_FILE=".agy-last-command"
FORCE=false

if [ "$1" = "--force" ]; then
  FORCE=true
  shift
fi

if [ $# -eq 0 ]; then
  echo "Usage: $0 [--force] <command> [args...]"
  exit 1
fi

# Reconstruct command string
CMD_STRING="$*"
CMD_HASH=$(echo -n "$CMD_STRING" | md5sum | cut -d' ' -f1)

# Check for duplicate
if [ -f "$STATE_FILE" ] && [ "$FORCE" = false ]; then
  LAST_HASH=$(cat "$STATE_FILE")
  if [ "$CMD_HASH" = "$LAST_HASH" ]; then
    echo "=========================================================="
    echo "WARNING: Duplicate command detected!"
    echo "Command: '$CMD_STRING'"
    echo "To execute this identical command again, run with --force:"
    echo "  $0 --force $CMD_STRING"
    echo "=========================================================="
    exit 2
  fi
fi

# Save state
echo -n "$CMD_HASH" > "$STATE_FILE"

# Execute command
exec "$@"
