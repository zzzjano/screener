FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
# Prisma CLI + silniki — wymagane do `migrate deploy` w entrypoint
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=deps /app/node_modules/@prisma/engines-version ./node_modules/@prisma/engines-version
COPY --from=deps /app/node_modules/@prisma/config ./node_modules/@prisma/config
COPY --from=deps /app/node_modules/@prisma/debug ./node_modules/@prisma/debug
COPY --from=deps /app/node_modules/@prisma/fetch-engine ./node_modules/@prisma/fetch-engine
COPY --from=deps /app/node_modules/@prisma/get-platform ./node_modules/@prisma/get-platform
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
