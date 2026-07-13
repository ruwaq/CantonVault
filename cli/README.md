# CantonVault CLI

A typed TypeScript CLI to interact with CantonVault smart contracts on the Canton Network DevNet.

## Install

```bash
cd cli
npm install
npm run build
```

## Usage

```bash
# Check DevNet connectivity
node dist/index.js status

# Upload the DAR to the DevNet
node dist/index.js deploy

# Create a CommitmentProposal (12,000 CC)
node dist/index.js propose --amount 12000 --description "Invoice INV-001"

# Accept a proposal
node dist/index.js accept <contractId>

# Fulfill a commitment
node dist/index.js fulfill <contractId> --note "Delivery confirmed"

# Raise a dispute (triggers selective disclosure)
node dist/index.js dispute <contractId> --reason "Goods not delivered"

# Refund a commitment
node dist/index.js refund <contractId> --alloc <allocationContractId>

# List vetted packages on the participant
node dist/index.js packages
```

## Architecture

```
cli/src/
├── types.ts           # CantonVault domain types + DevNet config
├── auth.ts            # OAuth2 token manager (auto-refresh, 8h tokens)
├── devnet-client.ts   # Typed Canton Ledger API v2 client
└── index.ts           # CLI entry point with commander.js
```

The CLI talks to the Canton Network DevNet via the JSON Ledger API v2 REST endpoint (not gRPC), using the shared hackathon validator credentials. All commands create real on-ledger transactions with verifiable `updateId` hashes.
