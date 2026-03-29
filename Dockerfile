FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runner ----
FROM node:22-slim

# Install dbmate for migrations
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && \
    curl -fsSL -o /usr/local/bin/dbmate \
      "https://github.com/amacneil/dbmate/releases/latest/download/dbmate-linux-$(dpkg --print-architecture)" && \
    chmod +x /usr/local/bin/dbmate && \
    apt-get purge -y curl && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY db/migrations ./db/migrations

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && mkdir -p db

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
