import fastify from "fastify";
import cors from "@fastify/cors";
import { runInstantScan } from "./server/screeners/instant-scan";
import { logger } from "./lib/logger";
import { liveScanQueue } from "./server/jobs/queues";
import crypto from "crypto";

// Import the existing worker bootstrap logic
import "./worker/index";

import portfolioRoutes from "./api/portfolio";
import settingsRoutes from "./api/settings";
import backtestsRoutes from "./api/backtests";
import screenersRoutes from "./api/screeners";
import alertsRoutes from "./api/alerts";
import marketDataRoutes from "./api/market-data";
import telegramRoutes from "./api/telegram";
import healthRoutes from "./api/health";
import livePresetsRoutes from "./api/live-presets";

const server = fastify({ logger: true });

server.register(cors, {
  origin: "*", // Adjust in production
});

server.register(portfolioRoutes, { prefix: "/portfolio" });
server.register(settingsRoutes, { prefix: "/settings" });
server.register(backtestsRoutes, { prefix: "/backtests" });
server.register(screenersRoutes, { prefix: "/screeners" });
server.register(alertsRoutes, { prefix: "/alerts" });
server.register(marketDataRoutes, { prefix: "/market-data" });
server.register(telegramRoutes, { prefix: "/telegram" });
server.register(healthRoutes, { prefix: "/health" });
server.register(livePresetsRoutes, { prefix: "/live-presets" });



const start = async () => {
  try {
    await server.listen({ port: 4000, host: "0.0.0.0" });
    logger.info("Serwer Fastify uruchomiony na porcie 4000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
