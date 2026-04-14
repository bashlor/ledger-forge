FROM node:24-bookworm-slim@sha256:b506e7321f176aae77317f99d67a24b272c1f09f1d10f1761f2773447d8da26c AS base

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
COPY . .
RUN pnpm build -- --package-manager=pnpm

# ----------------------------
# Stage 3: Production runtime (distroless)
# ----------------------------
FROM cgr.dev/chainguard/node:latest@sha256:f05865c39e39728adbd1dd5b418e853694631e8818cf1468a5b6b73d65889b15 AS production
WORKDIR /app
ENV NODE_ENV=production

# "node ace build" outputs a standalone app under /build with prod deps.
COPY --from=build --chown=nonroot:nonroot /app/build ./
USER nonroot:nonroot

EXPOSE 3333
CMD ["node", "bin/server.js"]
