export interface PlaceCallInput {
  from: string;
  to: string;
  statusCallbackUrl: string;
  customField?: string;
  timeoutSeconds?: number;
  record?: boolean;
}

export interface PlaceCallResult {
  providerCallId: string;
  status: string;
  raw?: unknown;
}

export interface TransferCallInput {
  providerCallId: string;
  to: string;
}

export interface TelephonyProvider {
  placeOutboundCall(input: PlaceCallInput): Promise<PlaceCallResult>;
  hangup(providerCallId: string): Promise<void>;
  transfer(input: TransferCallInput): Promise<void>;
  getCall(providerCallId: string): Promise<unknown>;
}

export interface TelephonyWebhookPayload {
  eventKey: string;
  providerCallId: string;
  status: string;
  direction?: "inbound" | "outbound";
  from?: string;
  to?: string;
  raw: Record<string, unknown>;
}
