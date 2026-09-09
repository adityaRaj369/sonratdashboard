import { Queue, Worker, type ConnectionOptions, type Job } from "bullmq";
import { getConfig } from "@sonrat/config";
import {
  DEFAULT_JOB_OPTIONS,
  JOB_NAMES,
  QUEUE_NAMES,
  queueForJob,
  type JobName,
} from "./queues.js";
import { jobHandlers } from "./jobs/index.js";
import type { WorkerContext } from "./jobs/types.js";
import { createTelephonyClient } from "./integrations/exotel.js";
import { AdmissionController } from "./lib/admission.js";
import {
  classifyFailure,
  computeBackoffMs,
  PermanentJobError,
} from "./lib/retry.js";
import { createRedisConnection, closeRedis } from "./lib/redis.js";
import { logger } from "./lib/logger.js";

const ALL_QUEUES = Object.values(QUEUE_NAMES).filter((q) => q !== QUEUE_NAMES.dlq);

export async function startWorker(): Promise<{
  close: () => Promise<void>;
}> {
  const config = getConfig();
  const connection = createRedisConnection(config.REDIS_URL);
  const connOpts = connection as unknown as ConnectionOptions;

  const queues = new Map<string, Queue>();
  for (const name of Object.values(QUEUE_NAMES)) {
    queues.set(
      name,
      new Queue(name, {
        connection: connOpts,
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    );
  }

  const dlq = queues.get(QUEUE_NAMES.dlq)!;
  const telephony = createTelephonyClient();
  const admission = new AdmissionController(connection);

  const ctx: WorkerContext = {
    telephony,
    admission,
    voiceRuntimeUrl: config.VOICE_RUNTIME_URL,
    apiBaseUrl: config.API_BASE_URL,
    enqueue: async (name, data, opts) => {
      const qName = queueForJob(name);
      const q = queues.get(qName)!;
      await q.add(name, data, {
        jobId: opts?.jobId,
        delay: opts?.delay,
        priority: opts?.priority,
        ...DEFAULT_JOB_OPTIONS,
      });
    },
  };

  let accepting = true;
  const workers: Worker[] = [];

  for (const queueName of ALL_QUEUES) {
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        if (!accepting) {
          throw new Error("Worker draining; retry later");
        }
        const name = job.name as JobName;
        const handler = jobHandlers[name];
        if (!handler) {
          throw new PermanentJobError(`No handler for job ${job.name}`);
        }
        logger.info(
          { jobId: job.id, name, queue: queueName, attempt: job.attemptsMade + 1 },
          "job start",
        );
        const result = await handler(job, ctx);
        logger.info({ jobId: job.id, name }, "job complete");
        return result;
      },
      {
        connection: connOpts,
        concurrency: queueName === QUEUE_NAMES.calls ? 10 : 5,
        settings: {
          backoffStrategy: (attemptsMade: number) =>
            computeBackoffMs({ attempt: attemptsMade }),
        },
      },
    );

    worker.on("failed", (job, err) => {
      if (!job) return;
      const failureClass = classifyFailure(err);
      logger.error(
        {
          jobId: job.id,
          name: job.name,
          failureClass,
          err: err.message,
          attempts: job.attemptsMade,
        },
        "job failed",
      );

      const maxAttempts = job.opts.attempts ?? DEFAULT_JOB_OPTIONS.attempts;
      const exhausted =
        failureClass === "PERMANENT" || job.attemptsMade >= maxAttempts;

      if (exhausted) {
        void dlq.add(
          "dead_letter",
          {
            originalQueue: queueName,
            originalJobName: job.name,
            originalJobId: job.id,
            data: job.data,
            error: err.message,
            failureClass,
            failedAt: new Date().toISOString(),
          },
          { removeOnComplete: false },
        );
      }
    });

    workers.push(worker);
  }

  // Periodic maintenance
  const defaultQ = queues.get(QUEUE_NAMES.default)!;
  await defaultQ.add(
    JOB_NAMES.cleanup_expired_sessions,
    { olderThanMinutes: 120 },
    { repeat: { every: 15 * 60_000 }, jobId: "repeat:cleanup_expired_sessions" },
  );
  await queues.get(QUEUE_NAMES.outbox)!.add(
    JOB_NAMES.process_outbox,
    { batchSize: 50 },
    { repeat: { every: 5_000 }, jobId: "repeat:process_outbox" },
  );

  logger.info(
    {
      queues: ALL_QUEUES,
      telephony: config.MOCK_TELEPHONY ? "mock" : config.TELEPHONY_PROVIDER,
    },
    "worker started",
  );

  const close = async () => {
    accepting = false;
    logger.info("worker graceful shutdown: stop accepting, drain, close");
    await Promise.all(workers.map((w) => w.close()));
    await Promise.all([...queues.values()].map((q) => q.close()));
    await closeRedis();
  };

  return { close };
}

async function main() {
  const { close } = await startWorker();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutdown signal");
    await close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "worker failed to start");
  process.exit(1);
});
