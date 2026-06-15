import type { CoinGeckoCoinMarket } from "./coingecko-client";

const MANUAL_BYBIT_BASE_ALIASES: Record<string, string> = {
  "1000PEPE": "PEPE",
  "1000BONK": "BONK",
  "1000FLOKI": "FLOKI",
};

export function bybitBaseFromSymbol(symbol: string): string {
  const compact = symbol.split(":")[0].replace("/", "").toUpperCase();
  return compact.endsWith("USDT") ? compact.slice(0, -4) : compact;
}

export function mapCoinGeckoIdForBybitSymbol(
  bybitSymbol: string,
  coins: CoinGeckoCoinMarket[],
): string | null {
  const base = bybitBaseFromSymbol(bybitSymbol);
  const normalizedBase = MANUAL_BYBIT_BASE_ALIASES[base] ?? base;
  const matches = coins.filter((coin) => coin.symbol.toUpperCase() === normalizedBase);
  if (matches.length === 0) return null;
  return matches.sort((a, b) => (a.market_cap_rank ?? 999999) - (b.market_cap_rank ?? 999999))[0].id;
}

export function inferSectorTags(coinId: string): string[] {
  const tags: string[] = [];
  const id = coinId.toLowerCase();
  if (/(ai|artificial|fetch|render|bittensor|akash)/.test(id)) tags.push("AI");
  if (/(doge|shib|pepe|floki|bonk|meme)/.test(id)) tags.push("Meme");
  if (/(bitcoin|ethereum|solana|near|sui|aptos|ton|cardano|avalanche)/.test(id)) tags.push("L1");
  if (/(defi|uniswap|aave|curve|pendle|maker)/.test(id)) tags.push("DeFi");
  return Array.from(new Set(tags));
}
