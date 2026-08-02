#!/usr/bin/env bash
# Remind the agent about Bold auth/config checklist on stop.
set -euo pipefail
cat >/dev/null
jq -n '{
  followup_message: "Bold checklist: (1) OTP email/SMS delivery configured? (2) GOOGLE_CLIENT_ID set for real Gmail GIS? (3) OPENROUTER_API_KEY present for Brain? (4) DB migrations applied?"
}'
exit 0
