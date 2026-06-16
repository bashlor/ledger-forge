# syntax=docker/dockerfile:1.7
FROM node:24@sha256:8530f76a96d88820d288761f022e318970dda93d01536919fbc16076b7983e63 AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ----------------------------
# Stage 1: Install dependencies for build
# ----------------------------
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ----------------------------
# Stage 2: Build the application
# ----------------------------
FROM deps AS build
WORKDIR /app
ARG BUILD_APP_URL
ARG BUILD_DB_DATABASE
ARG BUILD_DB_HOST
ARG BUILD_DB_PORT
ARG BUILD_DB_USER
ARG BUILD_HOST
ARG BUILD_LOG_LEVEL
ARG BUILD_INCLUDE_DEV_TOOLS=false
ARG BUILD_PORT
ARG BUILD_POSTGRES_TEST_IMAGE
ARG BUILD_REQUIRE_EMAIL_VERIFICATION
ARG BUILD_SESSION_DRIVER
COPY . .
RUN --mount=type=secret,id=app_key \
	--mount=type=secret,id=better_auth_secret \
	--mount=type=secret,id=db_password \
	APP_KEY="$(cat /run/secrets/app_key)" \
	APP_URL="${BUILD_APP_URL:-http://localhost:3333}" \
	BETTER_AUTH_SECRET="$(cat /run/secrets/better_auth_secret)" \
	DB_DATABASE="${BUILD_DB_DATABASE:-app}" \
	DB_HOST="${BUILD_DB_HOST:-localhost}" \
	DB_PASSWORD="$(cat /run/secrets/db_password)" \
	DB_PORT="${BUILD_DB_PORT:-5432}" \
	DB_USER="${BUILD_DB_USER:-app}" \
	HOST="${BUILD_HOST:-localhost}" \
	BUILD_INCLUDE_DEV_TOOLS="${BUILD_INCLUDE_DEV_TOOLS}" \
	LOG_LEVEL="${BUILD_LOG_LEVEL:-info}" \
	PORT="${BUILD_PORT:-3333}" \
	POSTGRES_TEST_IMAGE="${BUILD_POSTGRES_TEST_IMAGE:-docker.io/postgres:17-alpine@sha256:979c4379dd698aba0b890599a6104e082035f98ef31d9b9291ec22f2b13059ca}" \
	REQUIRE_EMAIL_VERIFICATION="${BUILD_REQUIRE_EMAIL_VERIFICATION:-false}" \
	SESSION_DRIVER="${BUILD_SESSION_DRIVER:-memory}" \
	VITE_INCLUDE_DEV_TOOLS="${BUILD_INCLUDE_DEV_TOOLS}" \
	pnpm build -- --package-manager=pnpm
RUN if [ "${BUILD_INCLUDE_DEV_TOOLS}" != "true" ]; then node scripts/verify-prod-build-no-dev-tools.mjs build; fi

FROM base AS runtime_deps
WORKDIR /app/build
COPY --from=build /app/build/package.json ./
COPY --from=build /app/build/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# ----------------------------
# Stage 3: Production runtime (distroless)
# ----------------------------
FROM cgr.dev/chainguard/node:latest@sha256:3e212e37f83e078397dd8431964a4d703b5ecba9ed508c2748ad24a11930a746 AS production
WORKDIR /app
ENV NODE_ENV=production

# "node ace build" outputs a standalone app under /build with prod deps.
COPY --from=build --chown=node:node /app/build ./
COPY --from=runtime_deps --chown=node:node /app/build/node_modules ./node_modules
COPY --from=build --chown=node:node /app/docker ./docker
USER node:node

EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3333/health/live').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["/bin/sh", "/app/docker/with-docker-secrets.sh"]
CMD ["bin/server.js"]