import { timeframeToMs } from "../market-data/timeframe";
import { getLiquidationAggregate } from "./redis-store";

export async function getLiquidationMetric(
  marketType: string,
  symbol: string,
  timeframe: string,
  side: "BUY" | "SELL" | "NET",
): Promise<number> {
  const aggregate = await getLiquidationAggregate(
    marketType,
    symbol,
    timeframe,
    timeframeToMs(timeframe),
  );

  if (side === "BUY") return aggregate.buyNotional;
  if (side === "SELL") return aggregate.sellNotional;
  return aggregate.buyNotional - aggregate.sellNotional;
}
