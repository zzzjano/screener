# Crypto Screener

Polski screener kryptowalut zbudowany na Next.js, PostgreSQL, Redis, Bybit WebSocket i Telegram.

## Stack

- Next.js App Router + TypeScript
- PostgreSQL + Prisma (stan biznesowy)
- Redis (rolling OHLCV, cache, BullMQ)
- ccxt REST (backfill)
- Bybit WebSocket (live klines)
- technicalindicators
- Telegram Bot API

## Uruchomienie lokalne

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Worker (osobny terminal):

```bash
npm run worker
```

## Testy

```bash
npm test
```

## Architektura

- PostgreSQL: użytkownicy, screenery, JSONB AST reguł, alerty, historia matchy
- Redis: rolling windows OHLCV, dependency index, kolejki BullMQ
- REST ccxt: tylko backfill i sync metadanych rynków
- WebSocket: live zamknięte świece → event `candle.closed` → ewaluacja screenerów
