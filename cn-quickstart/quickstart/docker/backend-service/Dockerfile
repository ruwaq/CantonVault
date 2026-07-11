# CantonVault Backend Dockerfile
# Multi-stage, non-root, with healthcheck — production-ready
# Build: docker build -t cantonvault-backend -f docker/backend-service/Dockerfile ../../
# (run from cn-quickstart/quickstart/ folder)

FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build
COPY . /build/
RUN chmod +x gradlew && ./gradlew :backend:installDist -x test --no-daemon --console=plain

FROM eclipse-temurin:21-jre
# Non-root user for production security
RUN useradd --create-home --shell /bin/bash --uid 1001 cantonvault
# SECURITY (audit infra): install curl for healthcheck (the JRE image does not
# include it). Removed after install to minimize attack surface.
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app /opt/backend /onboarding && chown -R cantonvault:cantonvault /app /opt/backend /onboarding

COPY --from=builder --chown=1001:1001 /build/backend/build/install/backend /opt/backend
COPY --chown=1001:1001 docker/backend-service/start.sh /app/start.sh
RUN chmod +x /app/start.sh

USER cantonvault

WORKDIR /app

# Healthcheck via Spring Actuator
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${BACKEND_PORT:-8080}/actuator/health || exit 1

EXPOSE ${BACKEND_PORT:-8080}

ENTRYPOINT ["/app/start.sh"]
