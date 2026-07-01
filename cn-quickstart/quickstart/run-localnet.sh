#!/usr/bin/env bash
# CantonVault wrapper for cn-quickstart docker compose.
#
# Why this exists: the project lives in a directory whose path contains spaces
# ("Build on Canton Hackathon"). The upstream Makefile builds absolute paths
# (MODULES_DIR=$(pwd)/...) and passes them unquoted to `docker compose`, which
# breaks the command into three tokens at each space. This wrapper reproduces
# `make start` / `make build-docker-images` using RELATIVE paths so the space is
# never an issue, while exporting the same env vars the Makefile would.
#
# Usage:
#   ./run-localnet.sh build     # build docker images (== make build-docker-images)
#   ./run-localnet.sh up        # create + start containers (== make start)
#   ./run-localnet.sh down      # stop + remove containers
#   ./run-localnet.sh logs      # tail all logs
#   ./run-localnet.sh ps        # list containers
set -euo pipefail

cd "$(dirname "$0")"

# Replicate the env the Makefile exports.
export MODULES_DIR="$(pwd)/docker/modules"
export LOCALNET_DIR="${MODULES_DIR}/localnet"
# .env carries SPLICE_VERSION / DAML_RUNTIME_VERSION; IMAGE_TAG mirrors the Makefile.
# shellcheck disable=SC1091
set -a; source .env; set +a
export IMAGE_TAG="${SPLICE_VERSION}"
# shellcheck disable=SC1091
[ -f .env.local ] && { set -a; source .env.local; set +a; }

PROFILES="--profile app-provider --profile app-user --profile sv --profile swagger-ui --profile pqs-app-provider"
FILES=(
  -f compose.yaml
  -f docker/modules/localnet/compose.yaml
  -f docker/modules/splice-onboarding/compose.yaml
  -f docker/modules/pqs/compose.yaml
)
ENVFILES=(
  --env-file .env
  --env-file .env.local
  --env-file docker/modules/localnet/compose.env
  --env-file docker/modules/localnet/env/common.env
  --env-file docker/modules/pqs/compose.env
)
RESOURCE=(
  -f docker/modules/localnet/resource-constraints.yaml
  -f docker/modules/splice-onboarding/resource-constraints.yaml
  -f docker/modules/pqs/resource-constraints.yaml
  -f ./docker/backend-service/resource-constraints.yaml
)

case "${1:-up}" in
  build)
    docker compose "${FILES[@]}" "${ENVFILES[@]}" $PROFILES "${RESOURCE[@]}" build
    ;;
  up)
    docker compose "${FILES[@]}" "${ENVFILES[@]}" $PROFILES "${RESOURCE[@]}" up -d --no-recreate
    ;;
  down)
    docker compose "${FILES[@]}" "${ENVFILES[@]}" $PROFILES down
    ;;
  logs)
    docker compose "${FILES[@]}" "${ENVFILES[@]}" $PROFILES logs -f --tail=100
    ;;
  ps)
    docker compose "${FILES[@]}" "${ENVFILES[@]}" $PROFILES ps
    ;;
  restart-backend)
    # Rebuild only the backend-service image and recreate the container,
    # leaving Canton/Splice/Postgres untouched.
    docker compose "${FILES[@]}" "${ENVFILES[@]}" $PROFILES "${RESOURCE[@]}" up -d --no-deps --force-recreate --build backend-service
    ;;
  *)
    echo "Usage: $0 {build|up|down|logs|ps|restart-backend}"
    exit 1
    ;;
esac
