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

# Uruchomienie lokalne

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

## Docker (web + worker + baza)

```bash
cp .env.example .env
# Ustaw NEXT_PUBLIC_APP_URL na publiczny adres (np. http://twoj-vps:3011)
docker compose up -d --build
docker compose exec web npx prisma db push
docker compose exec web npm run db:seed
```

Aplikacja: `http://localhost:3011` (domyślnie `WEB_PORT=3011` w `.env` lub compose).

W `.env` ustaw hosty `postgres` i `redis` (nie `localhost`) — Docker Compose przekazuje ten plik
bezpośrednio do kontenerów (`env_file: .env`), bez nadpisywania w compose.

Przy `npm run dev` na hoście (bez Dockera) zmień w `.env` na `localhost:5432` i `localhost:6379`.

## Testy

```bash
npm test
```

## Architektura

- PostgreSQL: użytkownicy, screenery, JSONB AST reguł, alerty, historia matchy
- Redis: rolling windows OHLCV, dependency index, kolejki BullMQ
- REST ccxt: tylko backfill i sync metadanych rynków
- WebSocket: live zamknięte świece → event `candle.closed` → ewaluacja screenerów
