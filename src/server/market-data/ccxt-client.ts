import ccxt, { type bybit, type OHLCV } from "ccxt";

let exchangeInstance: bybit | null = null;

export function getCcxtBybit(): bybit {
  if (!exchangeInstance) {
    exchangeInstance = new ccxt.bybit({
      enableRateLimit: true,
      options: { defaultType: "linear" },
    });
  }
  return exchangeInstance;
}

export async function fetchHistoricalCandles(
  symbol: string,
  timeframe: string,
  limit = 200,
): Promise<OHLCV[]> {
  const exchange = getCcxtBybit();
  await exchange.loadMarkets();
  const ccxtSymbol = symbol.includes("/") ? symbol : symbol.replace("USDT", "/USDT");
  return exchange.fetchOHLCV(ccxtSymbol, timeframe, undefined, limit);
}
