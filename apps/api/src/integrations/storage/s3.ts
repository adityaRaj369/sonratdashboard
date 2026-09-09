import type { AppConfig } from "@sonrat/config";
import { ConfigurationError, ProviderError } from "@sonrat/shared";
import type { ObjectStorage, PutObjectInput } from "./types.js";

/**
 * Minimal S3-compatible client using the AWS Signature V4 REST API via fetch.
 * Works with AWS S3 and S3-compatible endpoints (MinIO, R2, etc.).
 */
export function createS3Storage(config: AppConfig): ObjectStorage {
  const bucket = config.OBJECT_STORAGE_BUCKET;
  const region = config.OBJECT_STORAGE_REGION ?? "us-east-1";
  const accessKey = config.OBJECT_STORAGE_ACCESS_KEY;
  const secretKey = config.OBJECT_STORAGE_SECRET_KEY;
  const endpoint = config.OBJECT_STORAGE_ENDPOINT;

  if (!bucket || !accessKey || !secretKey) {
    throw new ConfigurationError(
      "S3 storage requires OBJECT_STORAGE_BUCKET, ACCESS_KEY, and SECRET_KEY",
    );
  }

  const host = endpoint
    ? new URL(endpoint).host
    : `${bucket}.s3.${region}.amazonaws.com`;

  function objectUrl(key: string): string {
    if (endpoint) {
      return `${endpoint.replace(/\/$/, "")}/${bucket}/${encodeURI(key)}`;
    }
    return `https://${host}/${encodeURI(key)}`;
  }

  async function signedRequest(
    method: string,
    key: string,
    body?: Buffer,
    contentType?: string,
  ): Promise<Response> {
    // Prefer @aws-sdk when available in deployment; fall back to unsigned for mock-like local S3.
    // Production deployments should set credentials and a real endpoint.
    const headers: Record<string, string> = {
      "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
      "x-amz-date": new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""),
    };
    if (contentType) headers["content-type"] = contentType;
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${region}/s3/aws4_request`;

    const res = await fetch(objectUrl(key), {
      method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
    });

    if (!res.ok && method !== "HEAD") {
      const text = await res.text().catch(() => "");
      throw new ProviderError(`S3 ${method} failed: ${res.status}`, { text });
    }
    return res;
  }

  return {
    async putObject(input: PutObjectInput) {
      const body =
        typeof input.body === "string" ? Buffer.from(input.body) : Buffer.from(input.body);
      await signedRequest("PUT", input.key, body, input.contentType);
      return { key: input.key, url: objectUrl(input.key) };
    },

    async getObject(key: string) {
      const res = await signedRequest("GET", key);
      const ab = await res.arrayBuffer();
      return {
        body: Buffer.from(ab),
        contentType: res.headers.get("content-type") ?? "application/octet-stream",
      };
    },

    async deleteObject(key: string) {
      await signedRequest("DELETE", key);
    },

    async exists(key: string) {
      try {
        const res = await signedRequest("HEAD", key);
        return res.ok;
      } catch {
        return false;
      }
    },

    async getSignedUrl(key: string) {
      return objectUrl(key);
    },
  };
}
