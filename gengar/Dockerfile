# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN NODE_OPTIONS=--max-old-space-size=4096 yarn build

# Stage 2: Production dependencies only
FROM node:20-slim AS deps

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Stage 3: Runtime
FROM node:20-slim

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

EXPOSE 3000

CMD ["node", "--expose-gc", "dist/src/main.js"]
