const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

export interface CoinGeckoCoinMarket {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number | null;
}

export interface CoinGeckoCategory {
  id: string;
  name: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${COINGECKO_BASE_URL}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`CoinGecko error ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export async function fetchCoinGeckoMarkets(): Promise<CoinGeckoCoinMarket[]> {
  return fetchJson<CoinGeckoCoinMarket[]>(
    "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false",
  );
}

export async function fetchCoinGeckoCategories(): Promise<CoinGeckoCategory[]> {
  return fetchJson<CoinGeckoCategory[]>("/coins/categories/list");
}
