# Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
# SPDX-License-Identifier: 0BSD

# SUPPLY-CHAIN-HARDENING: pin this to a digest (@sha256:...) for production.
# Dependabot (package-ecosystem: docker) will auto-bump digests.
FROM sgaunet/jwt-cli:latest AS jwtcli

FROM alpine:3.21
COPY --from=jwtcli /jwt-cli /usr/bin/jwt-cli
RUN apk add --no-cache jq curl bash
ENTRYPOINT ["/bin/bash"]