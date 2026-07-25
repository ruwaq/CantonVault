#!/usr/bin/env bash
# Copyright (c) 2026, CantonVault Hackathon. All rights reserved.
# SPDX-License-Identifier: 0BSD
#
# CantonVault — Create a CommitmentProposal on Canton DevNet
#
# Creates a CantonVault CommitmentProposal contract on-ledger via JSON Ledger API v2.
# This proves the contracts run on the Canton Network DevNet (not just LocalNet).
#
# Prerequisites:
#   - curl, jq
#   - CLIENT_SECRET environment variable set to the rotated DevNet m2m secret.
#     (audit Fase 3, C-1: the hardcoded secret was removed and rotated.)
#
# Evidence from 2026-07-13 run:
#   updateId: 1220c521048ebd4392a67d331a0cb6cebbc1beb03aed7da2b34ba1e40b4cedfec9f9

set -euo pipefail

# FAIL-CLOSED: CLIENT_SECRET must come from the environment. No hardcoded fallback.
: "${CLIENT_SECRET:?CLIENT_SECRET environment variable is required (audit Fase 3 C-1). Get it from auth.sandbox.fivenorth.io.}"

LEDGER_API="${LEDGER_API:-https://ledger-api.validator.devnet.sandbox.fivenorth.io}"
AUTH_URL="${AUTH_URL:-https://auth.sandbox.fivenorth.io/application/o/token/}"
CLIENT_ID="${CLIENT_ID:-validator-devnet-m2m}"
# Party of the m2m shared validator user (otc-canton-fund-oauth, sub=6)
MY_PARTY="${MY_PARTY:-cancore::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8}"
SYNCHRONIZER_ID="${SYNCHRONIZER_ID:-wallet::1220a14ca128063b8dc9d1ebb0bd22633be9f2168500f4dbc1ecaeb1855b14e5acf8}"
# Cryptographically random commandId (no Math.random equivalent in bash).
CMD_ID="cantonvault-$(head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')"

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

# Build the JSON payload with jq so $AMOUNT and $DESCRIPTION cannot inject fields
# (audit Fase 3, H-12: previously interpolated raw into a JSON string).
PAYLOAD=$(jq -n \
  --arg app "AppId" \
  --arg cmd "$CMD_ID" \
  --arg party "$MY_PARTY" \
  --argjson amount "$AMOUNT" \
  --arg desc "$DESCRIPTION" \
  --arg sync "$SYNCHRONIZER_ID" \
  '{
    applicationId: $app,
    commandId: $cmd,
    actAs: [$party],
    readAs: [$party],
    commands: [
      {
        CreateCommand: {
          templateId: "#cantonvault-contracts:Vault.CommitmentProposal:CommitmentProposal",
          createArguments: {
            proposer: $party,
            accepter: $party,
            thirdParty: $party,
            amount: $amount,
            currency: "CC",
            description: $desc,
            workflow: "supply-chain-finance",
            deadline: "2026-12-31T23:59:59Z",
            instrumentAdmin: $party,
            realSettlementRequired: false
          }
        }
      }
    ],
    transactionFormat: {
      synchronizerId: $sync
    }
  }')

# Submit create command
echo "Submitting CreateCommand..."
BODY=$(curl -s -w "\n%{http_code}" -X POST "$LEDGER_API/v2/commands/submit-and-wait" \
  --header "Authorization: Bearer $TOKEN" \
  --header 'Content-Type: application/json' \
  --data "$PAYLOAD")

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
