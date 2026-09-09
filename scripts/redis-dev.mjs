/**
 * Local Redis 7-compatible server for Windows (Memurai via redis-memory-server).
 * Binds REDIS_URL port (default 6379) so BullMQ / worker / API can connect.
 *
 * Usage: pnpm redis:dev
 */
import { RedisMemoryServer } from "redis-memory-server";

const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const parsed = new URL(url);
const port = Number(parsed.port || 6379);
const host = parsed.hostname || "127.0.0.1";

const server = await RedisMemoryServer.create({
  instance: { ip: host === "localhost" ? "127.0.0.1" : host, port },
});

const actualPort = await server.getPort();
const actualHost = await server.getHost();
console.log(`[redis:dev] Redis-compatible server listening on redis://${actualHost}:${actualPort}`);
console.log("[redis:dev] Keep this process running while using the worker / campaigns.");

const shutdown = async () => {
  console.log("[redis:dev] Stopping…");
  await server.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Keep alive
await new Promise(() => {});
