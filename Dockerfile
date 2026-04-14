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
FROM gcr.io/distroless/nodejs24-debian12@sha256:61f4f4341db81820c24ce771b83d202eb6452076f58628cd536cc7d94a10978b AS production
WORKDIR /app
ENV NODE_ENV=production

# "node ace build" outputs a standalone app under /build with prod deps.
COPY --from=build --chown=nonroot:nonroot /app/build ./
USER nonroot:nonroot

EXPOSE 3333
CMD ["bin/server.js"]
