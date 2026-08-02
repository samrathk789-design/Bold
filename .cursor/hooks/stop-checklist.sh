#!/usr/bin/env bash
# Remind the agent about Bold auth/config checklist on stop.
set -euo pipefail
cat >/dev/null
jq -n '{
  followup_message: "Bold checklist: (1) OTP email/SMS delivery configured? (2) Firebase Google/Apple/GitHub enabled + FIREBASE_* set (or ALLOW_DEV_OAUTH only in local)? (3) OPENROUTER_API_KEY for Brain? (4) JWT_SECRET strong + ALLOW_DEV_OAUTH=false in production? (5) DB migrations applied?"
}'
exit 0
