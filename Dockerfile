# Actual fixed linux/arm64 image: Node v22.23.3, verified before this recipe.
FROM node:22.23.3-bookworm-slim@sha256:b20fe038d9592822dd534600a1ddf467e985178aa3fed60ec441a056c2cc45bd AS builder
WORKDIR /app
ENV CI=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NPM_CONFIG_USERCONFIG=/tmp/npm-user-empty.rc NPM_CONFIG_GLOBALCONFIG=/tmp/npm-global-empty.rc
RUN touch /tmp/npm-user-empty.rc /tmp/npm-global-empty.rc \
    && apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global --ignore-scripts --registry=https://registry.npmjs.org pnpm@11.7.0
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts --ignore-pnpmfile \
    && pnpm rebuild esbuild \
    && node --input-type=module -e "import Database from 'better-sqlite3'; const db=new Database(':memory:'); if(db.prepare('SELECT 1 AS n').get().n!==1) throw new Error('SQLite smoke failed'); db.close(); console.log('Linux SQLite smoke passed');" \
    && pnpm build

FROM node:22.23.3-bookworm-slim@sha256:b20fe038d9592822dd534600a1ddf467e985178aa3fed60ec441a056c2cc45bd AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p /data && chown node:node /data
# Preserve the Linux pnpm virtual store and original workspace relative links.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/cli/package.json ./packages/cli/package.json
COPY --from=builder /app/packages/cli/node_modules ./packages/cli/node_modules
COPY --from=builder /app/packages/cli/dist ./packages/cli/dist
COPY --from=builder /app/packages/client/package.json ./packages/client/package.json
COPY --from=builder /app/packages/client/node_modules ./packages/client/node_modules
COPY --from=builder /app/packages/client/dist ./packages/client/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/package.json
COPY --from=builder /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/protocol/package.json ./packages/protocol/package.json
COPY --from=builder /app/packages/protocol/node_modules ./packages/protocol/node_modules
COPY --from=builder /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/package.json
COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/storage-sqlite/package.json ./packages/storage-sqlite/package.json
COPY --from=builder /app/packages/storage-sqlite/node_modules ./packages/storage-sqlite/node_modules
COPY --from=builder /app/packages/storage-sqlite/dist ./packages/storage-sqlite/dist
COPY --from=builder /app/modules/review/package.json ./modules/review/package.json
COPY --from=builder /app/modules/review/node_modules ./modules/review/node_modules
COPY --from=builder /app/modules/review/dist ./modules/review/dist
COPY --from=builder /app/packages/web/dist ./packages/web/dist
COPY --from=builder /app/scripts/integrations/deployment/container-health.mjs ./scripts/integrations/deployment/container-health.mjs
USER 1000:1000
VOLUME ["/data"]
EXPOSE 3000
STOPSIGNAL SIGTERM
ENTRYPOINT ["node", "/app/packages/cli/dist/index.js"]
CMD ["serve", "--host", "0.0.0.0", "--port", "3000", "--data-dir", "/data/instance"]
