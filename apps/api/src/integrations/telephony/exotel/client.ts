import type { AppConfig } from "@sonrat/config";
import { ConfigurationError, ProviderError } from "@sonrat/shared";
import { logger } from "../../../lib/logger.js";

export interface ExotelClientOptions {
  apiKey: string;
  apiToken: string;
  accountSid: string;
  subdomain: string;
}

export class ExotelClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  readonly accountSid: string;

  constructor(opts: ExotelClientOptions) {
    this.accountSid = opts.accountSid;
    this.baseUrl = `https://${opts.subdomain}/v1/Accounts/${opts.accountSid}`;
    this.authHeader =
      "Basic " + Buffer.from(`${opts.apiKey}:${opts.apiToken}`).toString("base64");
  }

  static fromConfig(config: AppConfig): ExotelClient {
    if (!config.EXOTEL_API_KEY || !config.EXOTEL_API_TOKEN || !config.EXOTEL_ACCOUNT_SID) {
      throw new ConfigurationError("Exotel credentials are not configured");
    }
    return new ExotelClient({
      apiKey: config.EXOTEL_API_KEY,
      apiToken: config.EXOTEL_API_TOKEN,
      accountSid: config.EXOTEL_ACCOUNT_SID,
      subdomain: config.EXOTEL_SUBDOMAIN,
    });
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: "application/json",
    };

    let fetchBody: string | undefined;
    if (body) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      fetchBody = new URLSearchParams(body).toString();
    }

    const res = await fetch(url, { method, headers, body: fetchBody });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      logger.error("exotel_api_error", {
        status: res.status,
        path,
        // never log Authorization
      });
      throw new ProviderError(`Exotel API error: ${res.status}`, { path, body: json });
    }

    return json as T;
  }
}

/** Exotel Call resource shape (subset used by Sonrat). */
export interface ExotelCallResource {
  Call?: {
    Sid?: string;
    ParentCallSid?: string;
    DateCreated?: string;
    DateUpdated?: string;
    AccountSid?: string;
    To?: string;
    From?: string;
    PhoneNumberSid?: string;
    Status?: string;
    StartTime?: string;
    EndTime?: string;
    Duration?: string;
    Price?: string;
    Direction?: string;
    AnsweredBy?: string;
    ForwardedFrom?: string;
    CallerName?: string;
    Uri?: string;
    RecordingUrl?: string;
  };
}
