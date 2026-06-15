-- AlterTable
ALTER TABLE "Screener" ADD COLUMN "scanAll" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LiveScreenerPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleTree" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveScreenerPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveScreenerPreset_userId_updatedAt_idx" ON "LiveScreenerPreset"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "LiveScreenerPreset" ADD CONSTRAINT "LiveScreenerPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
