import { FastifyPluginAsync } from 'fastify';
import { getRollingWindow } from '../server/market-data/rolling-window-store';
import { getActiveSymbols } from '../server/market-data/bybit-symbols';

const marketDataRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/snapshot', async (request, reply) => {
    const query = request.query as { symbol?: string; timeframe?: string; marketType?: string };
    const symbol = query.symbol ?? "BTCUSDT";
    const timeframe = query.timeframe ?? "15m";
    const marketType = query.marketType ?? "LINEAR";

    const candles = await getRollingWindow(marketType, symbol, timeframe);
    return reply.send({ symbol, timeframe, candles, count: candles.length });
  });

  fastify.get('/symbols', async (request, reply) => {
    try {
      const symbols = await getActiveSymbols();
      return reply.send({ symbols });
    } catch {
      return reply.send({
        symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT"],
      });
    }
  });
};

export default marketDataRoutes;
