#!/usr/bin/env bash
# Flag prompts that look like they contain live API secrets.
set -euo pipefail
input=$(cat)
prompt=$(echo "$input" | jq -r '.prompt // .text // empty' 2>/dev/null || true)

if echo "$prompt" | grep -Eqi 'sk-or-v1-|sk-live-|TWILIO_AUTH_TOKEN=|OPENROUTER_API_KEY=sk|AIza[0-9A-Za-z_-]{20,}'; then
  jq -n '{
    continue: true,
    user_message: "This prompt may contain a live secret. Prefer env vars / Cursor secrets instead of pasting keys in chat.",
    agent_message: "Secret-like material detected in the prompt. Do not echo secrets back; store them in backend/.env (gitignored) or Cursor environment secrets."
  }'
  exit 0
fi

echo '{ "continue": true }'
exit 0
