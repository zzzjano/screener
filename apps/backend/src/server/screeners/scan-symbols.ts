import type { CcxtMarketSession } from "../market-data/ccxt-client";
import { listActiveLinearCompactSymbols } from "../market-data/ccxt-client";

export interface ResolveScanSymbolsOptions {
  scanAll: boolean;
  symbols: string[];
  quoteAsset?: string;
  session?: CcxtMarketSession;
}

export async function resolveScanSymbols(options: ResolveScanSymbolsOptions): Promise<string[]> {
  if (options.scanAll) {
    if (options.session) {
      return Array.from(options.session.ccxtSymbolByCompact.keys()).sort();
    }
    return listActiveLinearCompactSymbols(options.quoteAsset ?? "USDT");
  }
  return options.symbols;
}
