import { Queue } from "bullmq";
import { getConfig } from "@sonrat/config";
import { logger } from "./logger.js";

/** Queue names must match apps/worker/src/queues.ts */
export const QUEUE_NAMES = {
  DEFAULT: "sonrat-default",
  OUTBOUND_CALLS: "sonrat-calls",
  CONTACT_IMPORT: "sonrat-imports",
  CAMPAIGN_DISPATCH: "sonrat-campaigns",
  WEBHOOK_PROCESS: "sonrat-default",
  RECORDINGS: "sonrat-recordings",
  OUTBOX: "sonrat-outbox",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<string, Queue>();

function connectionFromUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    maxRetriesPerRequest: null as null,
  };
}

export function getQueue(name: QueueName): Queue {
  const existing = queues.get(name);
  if (existing) return existing;

  const { REDIS_URL } = getConfig();
  const queue = new Queue(name, {
    connection: connectionFromUrl(REDIS_URL),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });

  queues.set(name, queue);
  return queue;
}

export async function enqueueJob<T extends Record<string, unknown>>(
  queueName: QueueName,
  jobName: string,
  data: T,
  opts?: { jobId?: string; delay?: number; priority?: number },
): Promise<string> {
  const queue = getQueue(queueName);
  const job = await queue.add(jobName, data, {
    jobId: opts?.jobId,
    delay: opts?.delay,
    priority: opts?.priority,
  });
  logger.info("job_enqueued", {
    queue: queueName,
    job_name: jobName,
    job_id: job.id,
    organization_id: typeof data.organizationId === "string" ? data.organizationId : undefined,
  });
  return job.id ?? "";
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}
