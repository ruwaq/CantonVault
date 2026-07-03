# Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
# SPDX-License-Identifier: 0BSD
ARG BASE_IMAGE

# SUPPLY-CHAIN-HARDENING: pin this to a digest (@sha256:...) for production.
# Dependabot (package-ecosystem: docker) will auto-bump digests.
FROM sgaunet/jwt-cli:latest AS jwtcli

FROM $BASE_IMAGE
COPY --from=jwtcli /jwt-cli /usr/bin/jwt-cli

WORKDIR /app
ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]
