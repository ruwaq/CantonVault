# CantonVault Backend Dockerfile
# Multi-stage, non-root, with healthcheck — production-ready
# Build: docker build -t cantonvault-backend -f docker/backend-service/Dockerfile ../../
# (run from cn-quickstart/quickstart/ folder)

FROM eclipse-temurin:21-jdk AS builder
WORKDIR /build
COPY backend/ /build/
RUN chmod +x gradlew && ./gradlew :backend:compileJava -x :daml:compileDaml -x test

FROM eclipse-temurin:21-jre
# Non-root user for production security
RUN useradd --create-home --shell /bin/bash --uid 1001 cantonvault
USER cantonvault

WORKDIR /app

# Copy the backend distribution tar
COPY --from=builder /build/backend/build/distributions/backend.tar /tmp/backend.tar
RUN tar -xf /tmp/backend.tar -C /app && rm /tmp/backend.tar

# Copy startup script
COPY docker/backend-service/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Healthcheck via Spring Actuator
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${BACKEND_PORT:-8080}/actuator/health || exit 1

EXPOSE ${BACKEND_PORT:-8080}

ENTRYPOINT ["/app/start.sh"]