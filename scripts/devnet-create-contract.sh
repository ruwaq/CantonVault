#!/usr/bin/env bash
# Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
# SPDX-License-Identifier: 0BSD
#
# CantonVault — Create a CommitmentProposal on Canton DevNet
#
# Creates a CantonVault CommitmentProposal contract on-ledger via JSON Ledger API v2.
# This proves the contracts run on the Canton Network DevNet (not just LocalNet).
#
# Evidence from 2026-07-13 run:
#   updateId: 1220c521048ebd4392a67d331a0cb6cebbc1beb03aed7da2b34ba1e40b4cedfec9f9
#   completionOffset: 4297574

set -euo pipefail

LEDGER_API="https://ledger-api.validator.devnet.sandbox.fivenorth.io"
AUTH_URL="https://auth.sandbox.fivenorth.io/application/o/token/"
CLIENT_ID="validator-devnet-m2m"
CLIENT_SECRET="r69FQmevLRwEgMB8NnKaSDHPewTOSx7Yy5jucsqAlmsAaJc3DlggedCz4tyyonl4W2WoOVzkUIjy8dHTlc16AOJQzx02QzJylAUG56oLTCoVCJUUK40vRv9CqQEY3fjn"
# Party of the m2m shared validator user (otc-canton-fund-oauth, sub=6)
MY_PARTY="cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8"
SYNCHRONIZER_ID="wallet::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8"
CMD_ID="cantonvault-$(date +%s)"

AMOUNT="${1:-5000}"
DESCRIPTION="${2:-DevNet CantonVault demo - Invoice INV-2026-001}"

echo "=== Create CommitmentProposal on Canton DevNet ==="
echo "  Amount: $AMOUNT CC"
echo "  Description: $DESCRIPTION"
echo ""

# Get token
TOKEN=$(curl -s -X POST "$AUTH_URL" \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data 'grant_type=client_credentials' \
  --data "client_id=$CLIENT_ID" \
  --data "client_secret=$CLIENT_SECRET" \
  --data "audience=$CLIENT_ID" \
  --data 'scope=daml_ledger_api' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Submit create command
echo "Submitting CreateCommand..."
BODY=$(curl -s -w "\n%{http_code}" -X POST "$LEDGER_API/v2/commands/submit-and-wait" \
  --header "Authorization: Bearer $TOKEN" \
  --header 'Content-Type: application/json' \
  --data "{
    \"applicationId\": \"AppId\",
    \"commandId\": \"$CMD_ID\",
    \"actAs\": [\"$MY_PARTY\"],
    \"readAs\": [\"$MY_PARTY\"],
    \"commands\": [
      {
        \"CreateCommand\": {
          \"templateId\": \"#cantonvault-contracts:Vault.CommitmentProposal:CommitmentProposal\",
          \"createArguments\": {
            \"proposer\": \"$MY_PARTY\",
            \"accepter\": \"$MY_PARTY\",
            \"thirdParty\": \"$MY_PARTY\",
            \"amount\": $AMOUNT,
            \"currency\": \"CC\",
            \"description\": \"$DESCRIPTION\",
            \"workflow\": \"supply-chain-finance\",
            \"deadline\": \"2026-12-31T23:59:59Z\",
            \"instrumentAdmin\": \"$MY_PARTY\",
            \"realSettlementRequired\": false
          }
        }
      }
    ],
    \"transactionFormat\": {
      \"synchronizerId\": \"$SYNCHRONIZER_ID\"
    }
  }")

HTTP_CODE=$(echo "$BODY" | tail -1 | tr -d '\n')
BODY=$(echo "$BODY" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "✅ SUCCESS — Contract created on Canton DevNet"
  echo "$BODY" | python3 -m json.tool
  echo ""
  UPDATE_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['updateId'])")
  OFFSET=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['completionOffset'])")
  echo "  updateId: $UPDATE_ID"
  echo "  completionOffset: $OFFSET"
else
  echo ""
  echo "❌ FAILED (HTTP $HTTP_CODE)"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  exit 1
fi
