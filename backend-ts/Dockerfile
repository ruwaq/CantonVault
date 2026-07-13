FROM node:22-slim

WORKDIR /app

# Install deps first (cache layer)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm install --omit=dev typescript@5.6.0 && npx tsc && npm uninstall typescript

# Run as non-root
USER node

EXPOSE 8080
CMD ["node", "dist/server.js"]
