import { createCcxtMarketSession, fetchHistoricalCandlesLimited } from "../src/server/market-data/ccxt-client";
import { getFreshRollingWindow, ccxtOhlcvToCandle, setRollingWindow } from "../src/server/market-data/rolling-window-store";
import { createIndicatorExecutionEngine } from "../src/server/indicators/indicator-execution-engine";
import { IndicatorConfigAst } from "../src/server/rules/ast";

async function verifyIndicators() {
  console.log("Starting Indicator Verification...");
  
  const symbol = "BTCUSDT";
  const timeframe = "15m";
  const requiredBars = 200;

  console.log(`Connecting to Bybit for ${symbol}...`);
  const session = await createCcxtMarketSession("USDT");

  console.log("Fetching RAW CCXT Candles...");
  const rawCCXT = await fetchHistoricalCandlesLimited(symbol, timeframe, requiredBars, session);
  const controlCandles = rawCCXT.map(ccxtOhlcvToCandle);

  console.log("Seeding Redis with CCXT Candles to simulate active system...");
  await setRollingWindow("LINEAR", symbol, timeframe, controlCandles, 500, "bybit");

  console.log("Fetching Redis-first Optimized Candles...");
  const optimizedCandles = await getFreshRollingWindow("LINEAR", symbol, timeframe, requiredBars) || [];
  
  if (optimizedCandles.length === 0) {
    throw new Error("Empty Redis Cache");
  }

  const indicatorEngine = createIndicatorExecutionEngine({
    symbolWorkload: 10,
    indicatorCount: 2,
  });

  const rsiConfig: IndicatorConfigAst = {
    id: "rsi-test",
    kind: "RSI",
    timeframe,
    source: "CLOSE",
    params: { length: 14 }
  };

  const emaConfig: IndicatorConfigAst = {
    id: "ema-test",
    kind: "EMA",
    timeframe,
    source: "CLOSE",
    params: { length: 200 }
  };

  const controlRsi = indicatorEngine.getIndicator(controlCandles, rsiConfig).current;
  const controlEma = indicatorEngine.getIndicator(controlCandles, emaConfig).current;

  const optimizedRsi = indicatorEngine.getIndicator(optimizedCandles, rsiConfig).current;
  const optimizedEma = indicatorEngine.getIndicator(optimizedCandles, emaConfig).current;

  console.log(`Control RSI: ${controlRsi}`);
  console.log(`Optimized RSI: ${optimizedRsi}`);
  console.log(`Control EMA: ${controlEma}`);
  console.log(`Optimized EMA: ${optimizedEma}`);

  const rsiDiff = Math.abs(controlRsi - optimizedRsi);
  const emaDiff = Math.abs(controlEma - optimizedEma);

  if (rsiDiff >= 0.0001 || emaDiff >= 0.0001 || Number.isNaN(rsiDiff) || Number.isNaN(emaDiff)) {
    throw new Error(`FATAL: Indicator calculation mismatch! RSI diff: ${rsiDiff}, EMA diff: ${emaDiff}`);
  }

  console.log("SUCCESS: Control group and Optimized group produce identical indicator values.");
  await indicatorEngine.dispose();
  process.exit(0);
}

verifyIndicators().catch(err => {
  console.error(err);
  process.exit(1);
});
