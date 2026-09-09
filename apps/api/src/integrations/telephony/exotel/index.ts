export { ExotelClient, type ExotelCallResource } from "./client.js";
export { ExotelCallService } from "./call-service.js";
export { ExotelWebhookService } from "./webhook-service.js";
export { ExotelStreamingService } from "./streaming-service.js";

import { getConfig } from "@sonrat/config";
import type { TelephonyProvider } from "../types.js";
import { createMockTelephony } from "../mock.js";
import { ExotelClient } from "./client.js";
import { ExotelCallService } from "./call-service.js";
import { ExotelWebhookService } from "./webhook-service.js";
import { ExotelStreamingService } from "./streaming-service.js";

export function createTelephonyProvider(): TelephonyProvider {
  const config = getConfig();
  if (config.MOCK_TELEPHONY || config.TELEPHONY_PROVIDER === "mock") {
    return createMockTelephony();
  }
  const client = ExotelClient.fromConfig(config);
  return new ExotelCallService(client);
}

export function createExotelWebhookService(): ExotelWebhookService {
  return new ExotelWebhookService();
}

export function createExotelStreamingService(): ExotelStreamingService {
  return new ExotelStreamingService(getConfig());
}
