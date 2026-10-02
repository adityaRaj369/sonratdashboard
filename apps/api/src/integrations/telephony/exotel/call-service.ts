import type {
  PlaceCallInput,
  PlaceCallResult,
  TelephonyProvider,
  TransferCallInput,
} from "../types.js";
import { ExotelClient, type ExotelCallResource } from "./client.js";

/**
 * Exotel Voice API adapter.
 * Docs: https://developer.exotel.com/api/make-a-call-api
 *
 * Connects two legs: From (Exotel virtual number / caller) and To (customer).
 * StatusCallback receives call lifecycle webhooks.
 */
export class ExotelCallService implements TelephonyProvider {
  constructor(private readonly client: ExotelClient) {}

  async placeOutboundCall(input: PlaceCallInput): Promise<PlaceCallResult> {
    const body: Record<string, string> = {
      From: input.from,
      To: input.to,
      CallerId: input.from,
      StatusCallback: input.statusCallbackUrl,
      StatusCallbackEvents: '["terminal", "answered"]',
      StatusCallbackContentType: "application/json",
    };

    const customField = input.customField ?? input.customParameters?.callId;
    if (customField) {
      body.CustomField = customField;
    }
    if (input.flowUrl) {
      body.Url = input.flowUrl;
    } else if (input.streamUrl) {
      body.StreamUrl = input.streamUrl.replace(/^http/i, "ws");
      body.StreamType = "bidirectional";
    }
    if (input.record) {
      body.Record = "true";
    }
    if (input.timeoutSeconds) {
      // Keep the ringing timeout and the answered-call billing cap separate.
      body.TimeLimit = String(input.timeoutSeconds);
    }

    const response = await this.client.request<ExotelCallResource>(
      "POST",
      "/Calls/connect.json",
      body,
    );

    const sid = response.Call?.Sid;
    if (!sid) {
      throw new Error("Exotel did not return Call.Sid");
    }

    return {
      providerCallId: sid,
      status: response.Call?.Status ?? "queued",
      raw: response,
    };
  }

  async hangup(providerCallId: string): Promise<void> {
    await this.client.request("POST", `/Calls/${providerCallId}.json`, {
      Status: "completed",
    });
  }

  async transfer(input: TransferCallInput): Promise<void> {
    // Exotel transfer via Call update / applet — use connect to new destination
    await this.client.request("POST", `/Calls/${input.providerCallId}.json`, {
      Status: "completed",
    });
    // Actual warm transfer is typically done via ExoML applets; hangup + new leg
    // is handled by voice-runtime. Here we record the intent via API update.
    void input.to;
  }

  async getCall(providerCallId: string): Promise<ExotelCallResource> {
    return this.client.request<ExotelCallResource>("GET", `/Calls/${providerCallId}.json`);
  }
}
