export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function encodeCursor(payload: { id: string; createdAt: Date | string }): string {
  const raw = JSON.stringify({
    id: payload.id,
    createdAt:
      typeof payload.createdAt === "string"
        ? payload.createdAt
        : payload.createdAt.toISOString(),
  });
  return Buffer.from(raw, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): { id: string; createdAt: Date } {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      id?: string;
      createdAt?: string;
    };
    if (!parsed.id || !parsed.createdAt) {
      throw new Error("invalid");
    }
    return { id: parsed.id, createdAt: new Date(parsed.createdAt) };
  } catch {
    throw new Error("Invalid cursor");
  }
}

export function paginateByCreatedAt<T extends { id: string; createdAt: Date }>(
  rows: T[],
  limit: number,
): CursorPage<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
    hasMore,
  };
}

export function cursorWhere(cursor?: string):
  | { OR: Array<{ createdAt: { lt: Date } } | { createdAt: Date; id: { lt: string } }> }
  | undefined {
  if (!cursor) return undefined;
  const { id, createdAt } = decodeCursor(cursor);
  return {
    OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }],
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
