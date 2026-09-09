export interface PutObjectInput {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface ObjectStorage {
  putObject(input: PutObjectInput): Promise<{ key: string; url?: string }>;
  getObject(key: string): Promise<{ body: Buffer; contentType: string }>;
  deleteObject(key: string): Promise<void>;
  getSignedUrl?(key: string, expiresSeconds?: number): Promise<string>;
  exists(key: string): Promise<boolean>;
}
