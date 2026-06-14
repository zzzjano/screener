import { PrismaClient, IndicatorKind, PriceSource } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@screener.local" },
    update: {},
    create: {
      email: "demo@screener.local",
      displayName: "Demo Użytkownik",
      locale: "pl",
      timezone: "Europe/Warsaw",
    },
  });

  const presets = [
    { name: "RSI 14", kind: IndicatorKind.RSI, timeframe: "15m", params: { period: 14 } },
    { name: "EMA 50", kind: IndicatorKind.EMA, timeframe: "15m", params: { period: 50 } },
    { name: "EMA 200", kind: IndicatorKind.EMA, timeframe: "4h", params: { period: 200 } },
    { name: "MACD standard", kind: IndicatorKind.MACD, timeframe: "1h", params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } },
    { name: "Bollinger 20/2", kind: IndicatorKind.BOLLINGER_BANDS, timeframe: "1h", params: { period: 20, stdDev: 2 } },
    { name: "ATR 14", kind: IndicatorKind.ATR, timeframe: "1h", params: { period: 14 } },
  ];

  for (const preset of presets) {
    const existing = await prisma.indicatorPreset.findFirst({
      where: { name: preset.name, isSystem: true, userId: null },
    });
    if (!existing) {
      await prisma.indicatorPreset.create({
        data: {
          name: preset.name,
          kind: preset.kind,
          timeframe: preset.timeframe,
          source: PriceSource.CLOSE,
          params: preset.params,
          isSystem: true,
        },
      });
    }
  }

  const defaultRuleTree = {
    version: 1 as const,
    root: {
      type: "GROUP" as const,
      id: "root",
      operator: "AND" as const,
      children: [
        {
          type: "CONDITION" as const,
          id: "cond-rsi",
          left: {
            kind: "INDICATOR" as const,
            indicator: {
              id: "ind-rsi",
              kind: "RSI",
              timeframe: "15m",
              source: "CLOSE",
              params: { period: 14 },
            },
          },
          comparator: "LT" as const,
          right: { kind: "CONSTANT" as const, value: 30 },
        },
      ],
    },
  };

  const existingScreener = await prisma.screener.findFirst({
    where: { userId: demoUser.id, name: "RSI poniżej 30" },
  });

  if (!existingScreener) {
    const screener = await prisma.screener.create({
      data: {
        userId: demoUser.id,
        name: "RSI poniżej 30",
        description: "Przykładowy screener systemowy",
        symbols: ["BTCUSDT", "ETHUSDT"],
        timeframes: ["15m"],
        ruleTree: defaultRuleTree,
        ruleTreeHash: "seed-demo",
        alerts: {
          create: {
            isEnabled: true,
            telegramEnabled: true,
            cooldownSeconds: 900,
          },
        },
      },
    });
    console.log("Utworzono demo screener:", screener.id);
  }

  console.log("Seed zakończony");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
