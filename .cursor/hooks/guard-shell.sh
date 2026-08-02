#!/usr/bin/env bash
# Soft-gate destructive shell commands.
set -euo pipefail
input=$(cat)
command=$(echo "$input" | jq -r '.command // empty')

if echo "$command" | grep -Eqi 'rm\s+-rf\s+/($| )|git\s+push\s+.*--force|mkfs\.|dd\s+if='; then
  jq -n --arg cmd "$command" '{
    permission: "ask",
    user_message: "Potentially destructive shell command — please review before continuing.",
    agent_message: ("Hook flagged destructive command: " + $cmd)
  }'
  exit 0
fi

echo '{ "permission": "allow" }'
exit 0
