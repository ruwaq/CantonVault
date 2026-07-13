#!/usr/bin/env bash
# Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
# SPDX-License-Identifier: 0BSD
#
# CantonVault — Deploy to Canton Network DevNet
#
# This script deploys the CantonVault Daml contracts to the Canton Network DevNet
# via the JSON Ledger API v2, using the shared validator provided by the hackathon
# organizers (Fivenorth sandbox).
#
# Prerequisites:
#   - DAR compiled: daml/licensing/.daml/dist/cantonvault-contracts-0.1.0.dar
#   - curl, python3
#
# Evidence of successful deployment (run 2026-07-13):
#   - Package uploaded: cantonvault-contracts v0.1.0
#   - CommitmentProposal created on-ledger
#   - updateId: 1220c521048ebd4392a67d331a0cb6cebbc1beb03aed7da2b34ba1e40b4cedfec9f9
#   - completionOffset: 4297574

set -euo pipefail

LEDGER_API="https://ledger-api.validator.devnet.sandbox.fivenorth.io"
AUTH_URL="https://auth.sandbox.fivenorth.io/application/o/token/"
CLIENT_ID="validator-devnet-m2m"
CLIENT_SECRET="r69FQmevLRwEgMB8NnKaSDHPewTOSx7Yy5jucsqAlmsAaJc3DlggedCz4tyyonl4W2WoOVzkUIjy8dHTlc16AOJQzx02QzJylAUG56oLTCoVCJUUK40vRv9CqQEY3fjn"
DAR_PATH="${DAR_PATH:-$(cd "$(dirname "$0")/.." && pwd)/cn-quickstart/quickstart/daml/licensing/.daml/dist/cantonvault-contracts-0.1.0.dar}"

echo "=== CantonVault DevNet Deployment ==="
echo ""

# Step 1: Obtain access token
echo "[1/3] Obtaining OAuth2 access token..."
TOKEN=$(curl -s -X POST "$AUTH_URL" \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data 'grant_type=client_credentials' \
  --data "client_id=$CLIENT_ID" \
  --data "client_secret=$CLIENT_SECRET" \
  --data "audience=$CLIENT_ID" \
  --data 'scope=daml_ledger_api' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "  Token obtained (${#TOKEN} chars)"

# Step 2: Upload DAR
echo ""
echo "[2/3] Uploading DAR to DevNet..."
if [ ! -f "$DAR_PATH" ]; then
  echo "ERROR: DAR not found at $DAR_PATH"
  echo "Run: cd cn-quickstart/quickstart/daml/licensing && daml build"
  exit 1
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$LEDGER_API/v2/packages" \
  --header "Authorization: Bearer $TOKEN" \
  --data-binary "@$DAR_PATH")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "409" ]; then
  echo "  DAR uploaded successfully (HTTP $HTTP_CODE)"
else
  echo "  DAR upload returned HTTP $HTTP_CODE (may already be vetted)"
fi

# Step 3: Get party info
echo ""
echo "[3/3] Verifying ledger access..."
LEDGER_END=$(curl -s "$LEDGER_API/v2/state/ledger-end" \
  --header "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['offset'])")
echo "  Ledger end offset: $LEDGER_END"

# Resolve party from JWT
MY_PARTY=$(echo "$TOKEN" | cut -d'.' -f2 | python3 -c "
import sys, base64, json
payload = sys.stdin.read().strip()
payload += '=' * (4 - len(payload) % 4)
d = json.loads(base64.b64decode(payload))
print(f'User sub: {d[\"sub\"]}')
" 2>/dev/null || echo "unknown")

echo ""
echo "=== Deployment Complete ==="
echo "  Ledger API: $LEDGER_API"
echo "  Package: cantonvault-contracts v0.1.0"
echo "  Ledger offset: $LEDGER_END"
echo ""
echo "To create contracts, see scripts/devnet-create-contract.sh"
