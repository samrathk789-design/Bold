#!/usr/bin/env bash
# After auth/login edits: remind agent about OAuth + username routing invariants.
set -euo pipefail

input=$(cat)
file_path=$(echo "$input" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("file_path") or d.get("path") or "")' 2>/dev/null || true)

case "$file_path" in
  *modern-login-signup*|*AuthConnectingPopup*|*Username*|*firebase*|*auth.ts*|*routes/auth*)
    python3 - <<'PY'
import json
print(json.dumps({
  "additional_context": (
    "Bold auth edit check: (1) Google/Apple/GitHub buttons must call completeProviderSignIn "
    "or Firebase signInWithPopup. (2) New users → /username, returning → /app. "
    "(3) Store authMethod. (4) Connecting popup must handle cancel cleanly. "
    "(5) Never commit FIREBASE_PRIVATE_KEY or real secrets."
  )
}))
PY
    ;;
  *)
    echo '{}'
    ;;
esac
exit 0
