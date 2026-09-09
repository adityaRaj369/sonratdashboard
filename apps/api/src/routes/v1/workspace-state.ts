import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "@sonrat/database";
import { z } from "zod";
import type { AppVariables } from "../../lib/crypto.js";
import { authMiddleware } from "../../middleware/auth.js";
import { tenantMiddleware, getUserId } from "../../middleware/tenant.js";

const workspaceState = new Hono<{ Variables: AppVariables }>();

const MAX_RECENTS = 4;
const MAX_BOOKMARKS = 10;

type PinnedRow = { key: string; pinnedAt: string };
type RecentRow = { key: string; lastVisitedAt: string };
type BookmarkRow = {
  id?: string;
  serviceKey: string;
  route?: string;
  label?: string;
  payload?: unknown;
  savedAt: string;
};

workspaceState.use("*", authMiddleware, tenantMiddleware);

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function dedupeByKey<T>(items: T[], keyFn: (item: T) => string | undefined) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function ensureState(userId: string) {
  const existing = await db.userWorkspaceState.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.userWorkspaceState.create({
    data: {
      userId,
      pinnedServices: [],
      recentServices: [],
      bookmarks: [],
    },
  });
}

function serialize(state: {
  pinnedServices: unknown;
  recentServices: unknown;
  bookmarks: unknown;
}) {
  return {
    pinnedServices: asArray<PinnedRow>(state.pinnedServices),
    recentServices: asArray<RecentRow>(state.recentServices),
    bookmarks: asArray<BookmarkRow>(state.bookmarks),
  };
}

workspaceState.get("/", async (c) => {
  const state = await ensureState(getUserId(c));
  return c.json({ success: true, data: serialize(state) });
});

workspaceState.post(
  "/recent",
  zValidator("json", z.object({ key: z.string().min(1) })),
  async (c) => {
    const { key } = c.req.valid("json");
    const userId = getUserId(c);
    const state = await ensureState(userId);
    const now = new Date().toISOString();
    const next = dedupeByKey(
      [{ key, lastVisitedAt: now }, ...asArray<RecentRow>(state.recentServices)],
      (row) => row.key,
    ).slice(0, MAX_RECENTS);

    const updated = await db.userWorkspaceState.update({
      where: { userId },
      data: { recentServices: next as object },
    });

    return c.json({ success: true, data: asArray<RecentRow>(updated.recentServices) });
  },
);

workspaceState.post(
  "/pins/toggle",
  zValidator("json", z.object({ key: z.string().min(1) })),
  async (c) => {
    const { key } = c.req.valid("json");
    const userId = getUserId(c);
    const state = await ensureState(userId);
    const now = new Date().toISOString();
    const current = asArray<PinnedRow>(state.pinnedServices);
    const exists = current.some((row) => row.key === key);
    const next = exists
      ? current.filter((row) => row.key !== key)
      : [{ key, pinnedAt: now }, ...current.filter((row) => row.key !== key)];

    const updated = await db.userWorkspaceState.update({
      where: { userId },
      data: { pinnedServices: next as object },
    });

    return c.json({ success: true, data: asArray<PinnedRow>(updated.pinnedServices) });
  },
);

workspaceState.post(
  "/bookmarks",
  zValidator(
    "json",
    z.object({
      serviceKey: z.string().min(1),
      route: z.string().optional(),
      label: z.string().optional(),
      payload: z.unknown().optional(),
    }),
  ),
  async (c) => {
    const body = c.req.valid("json");
    const userId = getUserId(c);
    const state = await ensureState(userId);
    const now = new Date().toISOString();
    const existing = asArray<BookmarkRow>(state.bookmarks);
    const rowId =
      body.payload && typeof body.payload === "object"
        ? String(
            (body.payload as { id?: string; _id?: string; key?: string }).id ??
              (body.payload as { _id?: string })._id ??
              (body.payload as { key?: string }).key ??
              "",
          )
        : "";
    const dedupeKey = `${body.serviceKey}::${rowId}::${body.route || ""}`;
    const filtered = existing.filter((bookmark) => {
      const bRowId = String(
        (bookmark.payload as { id?: string; _id?: string; key?: string } | null)?.id ??
          (bookmark.payload as { _id?: string } | null)?._id ??
          (bookmark.payload as { key?: string } | null)?.key ??
          "",
      );
      return `${bookmark.serviceKey}::${bRowId}::${bookmark.route || ""}` !== dedupeKey;
    });

    if (filtered.length >= MAX_BOOKMARKS) {
      return c.json(
        {
          success: false,
          code: "BOOKMARK_LIMIT",
          message: `You can only save up to ${MAX_BOOKMARKS} bookmarks.`,
        },
        400,
      );
    }

    const next: BookmarkRow[] = [
      {
        id: crypto.randomUUID(),
        serviceKey: body.serviceKey,
        route: body.route || "",
        label: body.label || "",
        payload: body.payload ?? null,
        savedAt: now,
      },
      ...filtered,
    ];

    const updated = await db.userWorkspaceState.update({
      where: { userId },
      data: { bookmarks: next as object },
    });

    return c.json({ success: true, data: asArray<BookmarkRow>(updated.bookmarks) });
  },
);

workspaceState.delete("/bookmarks/:bookmarkId", async (c) => {
  const bookmarkId = c.req.param("bookmarkId");
  const userId = getUserId(c);
  const state = await ensureState(userId);
  const next = asArray<BookmarkRow>(state.bookmarks).filter(
    (bookmark) => String(bookmark.id) !== String(bookmarkId),
  );
  const updated = await db.userWorkspaceState.update({
    where: { userId },
    data: { bookmarks: next as object },
  });
  return c.json({ success: true, data: asArray<BookmarkRow>(updated.bookmarks) });
});

export default workspaceState;
