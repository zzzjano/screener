import fastify from "fastify";
import cors from "@fastify/cors";
import { runInstantScan } from "./server/screeners/instant-scan";
import { logger } from "./lib/logger";
import { liveScanQueue } from "./server/jobs/queues";
import crypto from "crypto";

// Import the existing worker bootstrap logic
import "./worker/index";

const server = fastify({ logger: true });

server.register(cors, {
  origin: "*", // Adjust in production
});

server.post("/screeners/live", async (request, reply) => {
  const startedAt = Date.now();
  try {
    const body = request.body as { ruleTree?: unknown };
    if (!body?.ruleTree) {
      return reply.status(400).send({ error: "Brak ruleTree" });
    }

    logger.info("POST /screeners/live - żądanie przyjęte");

    const jobId = crypto.randomUUID();
    await liveScanQueue.add("run", { ruleTree: body.ruleTree }, { jobId });

    return reply.status(202).send({ jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd skanowania";
    logger.error("POST /screeners/live - błąd", { message });
    return reply.status(500).send({ error: message });
  }
});

server.get("/screeners/live/:jobId", async (request, reply) => {
  const { jobId } = request.params as { jobId: string };
  try {
    const job = await liveScanQueue.getJob(jobId);
    if (!job) {
      return reply.status(404).send({ error: "Job not found" });
    }

    const state = await job.getState();
    if (state === "completed") {
      return reply.send({ status: "completed", results: job.returnvalue });
    } else if (state === "failed") {
      return reply.send({ status: "failed", error: job.failedReason });
    } else {
      return reply.send({ status: state });
    }
  } catch (error) {
    return reply.status(500).send({ error: "Błąd pobierania zadania" });
  }
});

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
