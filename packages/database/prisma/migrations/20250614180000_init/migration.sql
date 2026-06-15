-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('SPOT', 'LINEAR', 'INVERSE');

-- CreateEnum
CREATE TYPE "ScreenerStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IndicatorKind" AS ENUM ('RSI', 'SMA', 'EMA', 'MACD', 'BOLLINGER_BANDS', 'ATR', 'ADX', 'STOCH_RSI', 'VWAP', 'OBV', 'MFI', 'ROC', 'CCI', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('OPEN', 'HIGH', 'LOW', 'CLOSE', 'HL2', 'HLC3', 'OHLC4');

-- CreateEnum
CREATE TYPE "TriggerPolicy" AS ENUM ('ON_ENTER', 'EVERY_CLOSED_CANDLE', 'ON_STATE_CHANGE');

-- CreateEnum
CREATE TYPE "AlertDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED_COOLDOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "passwordHash" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'pl',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Warsaw',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatIdEncrypted" TEXT NOT NULL,
    "username" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'bybit',
    "type" "MarketType" NOT NULL,
    "symbol" TEXT NOT NULL,
    "baseAsset" TEXT NOT NULL,
    "quoteAsset" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "precision" JSONB,
    "limits" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screener" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ScreenerStatus" NOT NULL DEFAULT 'DRAFT',
    "marketType" "MarketType" NOT NULL DEFAULT 'LINEAR',
    "quoteAsset" TEXT NOT NULL DEFAULT 'USDT',
    "symbols" TEXT[],
    "timeframes" TEXT[],
    "ruleTree" JSONB NOT NULL,
    "ruleTreeHash" TEXT NOT NULL,
    "compiledDependencies" JSONB,
    "triggerPolicy" "TriggerPolicy" NOT NULL DEFAULT 'ON_ENTER',
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 900,
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Screener_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicatorPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "IndicatorKind" NOT NULL,
    "timeframe" TEXT NOT NULL,
    "source" "PriceSource" NOT NULL DEFAULT 'CLOSE',
    "params" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndicatorPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenerMatch" (
    "id" TEXT NOT NULL,
    "screenerId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "candleCloseTime" TIMESTAMP(3) NOT NULL,
    "matched" BOOLEAN NOT NULL,
    "score" DECIMAL(18,8),
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenerMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "screenerId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT true,
    "messageTemplate" TEXT,
    "cooldownSeconds" INTEGER NOT NULL DEFAULT 900,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertDelivery" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "screenerMatchId" TEXT NOT NULL,
    "status" "AlertDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'telegram',
    "providerMessageId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "TelegramConnection_userId_isEnabled_idx" ON "TelegramConnection"("userId", "isEnabled");

-- CreateIndex
CREATE INDEX "Market_exchange_type_isActive_idx" ON "Market"("exchange", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Market_exchange_type_symbol_key" ON "Market"("exchange", "type", "symbol");

-- CreateIndex
CREATE INDEX "Screener_userId_status_idx" ON "Screener"("userId", "status");

-- CreateIndex
CREATE INDEX "Screener_status_marketType_idx" ON "Screener"("status", "marketType");

-- CreateIndex
CREATE INDEX "Screener_ruleTreeHash_idx" ON "Screener"("ruleTreeHash");

-- CreateIndex
CREATE INDEX "IndicatorPreset_userId_isSystem_kind_idx" ON "IndicatorPreset"("userId", "isSystem", "kind");

-- CreateIndex
CREATE INDEX "ScreenerMatch_screenerId_createdAt_idx" ON "ScreenerMatch"("screenerId", "createdAt");

-- CreateIndex
CREATE INDEX "ScreenerMatch_symbol_timeframe_candleCloseTime_idx" ON "ScreenerMatch"("symbol", "timeframe", "candleCloseTime");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenerMatch_screenerId_symbol_timeframe_candleCloseTime_key" ON "ScreenerMatch"("screenerId", "symbol", "timeframe", "candleCloseTime");

-- CreateIndex
CREATE INDEX "Alert_screenerId_isEnabled_idx" ON "Alert"("screenerId", "isEnabled");

-- CreateIndex
CREATE INDEX "AlertDelivery_status_nextRetryAt_idx" ON "AlertDelivery"("status", "nextRetryAt");

-- CreateIndex
CREATE UNIQUE INDEX "AlertDelivery_alertId_screenerMatchId_key" ON "AlertDelivery"("alertId", "screenerMatchId");

-- AddForeignKey
ALTER TABLE "TelegramConnection" ADD CONSTRAINT "TelegramConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screener" ADD CONSTRAINT "Screener_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicatorPreset" ADD CONSTRAINT "IndicatorPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenerMatch" ADD CONSTRAINT "ScreenerMatch_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "Screener"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "Screener"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
