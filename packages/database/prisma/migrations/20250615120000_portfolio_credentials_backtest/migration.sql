-- CreateEnum
CREATE TYPE "BacktestStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BacktestExitKind" AS ENUM ('TAKE_PROFIT_STOP_LOSS', 'BARS_ELAPSED', 'EITHER');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'DISABLED', 'REVOKED', 'ERROR');

-- CreateTable
CREATE TABLE "BacktestRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "screenerId" TEXT,
    "name" TEXT,
    "ruleTree" JSONB NOT NULL,
    "symbols" TEXT[],
    "timeframes" TEXT[],
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BacktestStatus" NOT NULL DEFAULT 'PENDING',
    "exitKind" "BacktestExitKind" NOT NULL,
    "exitConfig" JSONB NOT NULL,
    "metrics" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BacktestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacktestSignal" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "signalTime" TIMESTAMP(3) NOT NULL,
    "entryPrice" DECIMAL(30,12) NOT NULL,
    "exitTime" TIMESTAMP(3),
    "exitPrice" DECIMAL(30,12),
    "pnlPct" DECIMAL(18,8),
    "maxAdverseExcursionPct" DECIMAL(18,8),
    "maxFavorableExcursionPct" DECIMAL(18,8),
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacktestSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserExchangeCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'bybit',
    "label" TEXT,
    "apiKeyCiphertext" TEXT NOT NULL,
    "apiKeyIv" TEXT NOT NULL,
    "apiKeyAuthTag" TEXT NOT NULL,
    "apiSecretCiphertext" TEXT NOT NULL,
    "apiSecretIv" TEXT NOT NULL,
    "apiSecretAuthTag" TEXT NOT NULL,
    "keyFingerprint" TEXT NOT NULL,
    "keyVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastValidatedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserExchangeCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'bybit',
    "accountType" TEXT,
    "totalEquity" DECIMAL(30,12),
    "availableBalance" DECIMAL(30,12),
    "maintenanceMargin" DECIMAL(30,12),
    "initialMargin" DECIMAL(30,12),
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'bybit',
    "marketType" "MarketType" NOT NULL DEFAULT 'LINEAR',
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "contracts" DECIMAL(30,12),
    "entryPrice" DECIMAL(30,12),
    "markPrice" DECIMAL(30,12),
    "notional" DECIMAL(30,12),
    "leverage" DECIMAL(18,8),
    "unrealizedPnl" DECIMAL(30,12),
    "pnlPct" DECIMAL(18,8),
    "liquidationPrice" DECIMAL(30,12),
    "marginMode" TEXT,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BacktestRun_userId_status_idx" ON "BacktestRun"("userId", "status");

-- CreateIndex
CREATE INDEX "BacktestRun_status_createdAt_idx" ON "BacktestRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BacktestSignal_runId_signalTime_idx" ON "BacktestSignal"("runId", "signalTime");

-- CreateIndex
CREATE INDEX "BacktestSignal_symbol_timeframe_signalTime_idx" ON "BacktestSignal"("symbol", "timeframe", "signalTime");

-- CreateIndex
CREATE INDEX "UserExchangeCredential_userId_exchange_status_idx" ON "UserExchangeCredential"("userId", "exchange", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserExchangeCredential_userId_exchange_keyFingerprint_key" ON "UserExchangeCredential"("userId", "exchange", "keyFingerprint");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_userId_exchange_createdAt_idx" ON "PortfolioSnapshot"("userId", "exchange", "createdAt");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_credentialId_createdAt_idx" ON "PortfolioSnapshot"("credentialId", "createdAt");

-- CreateIndex
CREATE INDEX "PositionSnapshot_userId_symbol_createdAt_idx" ON "PositionSnapshot"("userId", "symbol", "createdAt");

-- CreateIndex
CREATE INDEX "PositionSnapshot_userId_createdAt_idx" ON "PositionSnapshot"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PositionSnapshot_credentialId_createdAt_idx" ON "PositionSnapshot"("credentialId", "createdAt");

-- AddForeignKey
ALTER TABLE "BacktestRun" ADD CONSTRAINT "BacktestRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacktestSignal" ADD CONSTRAINT "BacktestSignal_runId_fkey" FOREIGN KEY ("runId") REFERENCES "BacktestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserExchangeCredential" ADD CONSTRAINT "UserExchangeCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "UserExchangeCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionSnapshot" ADD CONSTRAINT "PositionSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionSnapshot" ADD CONSTRAINT "PositionSnapshot_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "UserExchangeCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
