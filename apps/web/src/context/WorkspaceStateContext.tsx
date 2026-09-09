"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  addBookmark as apiAddBookmark,
  getWorkspaceState as apiGetWorkspaceState,
  recordRecentService as apiRecordRecentService,
  removeBookmark as apiRemoveBookmark,
  togglePinnedService as apiTogglePinnedService,
  type WorkspaceBookmark,
  type WorkspaceRecent,
} from "@/services/workspaceState/workspaceState.service";

type RecentItem = { key: string; lastVisitedAt: number };

type WorkspaceStateContextValue = {
  hydrated: boolean;
  pinnedKeys: string[];
  recentItems: RecentItem[];
  bookmarks: WorkspaceBookmark[];
  togglePin: (key: string) => Promise<void>;
  recordVisit: (key: string) => Promise<void>;
  recordRecent: (key: string) => Promise<void>;
  addBookmark: (input: {
    serviceKey: string;
    route?: string;
    label?: string;
    payload?: unknown;
  }) => Promise<WorkspaceBookmark[]>;
  removeBookmark: (bookmarkId: string) => Promise<WorkspaceBookmark[]>;
  hydrate: () => Promise<void>;
};

const WorkspaceStateContext = createContext<WorkspaceStateContextValue | null>(null);

const MAX_RECENTS = 4;

function normalizeRecents(items: WorkspaceRecent[]): RecentItem[] {
  return items
    .map((item) => ({
      key: item.key,
      lastVisitedAt:
        typeof item.lastVisitedAt === "number"
          ? item.lastVisitedAt
          : new Date(item.lastVisitedAt).getTime() || Date.now(),
    }))
    .slice(0, MAX_RECENTS);
}

export function WorkspaceStateProvider({ children }: { children: ReactNode }) {
  const { data } = useAuth();
  const userId = data?.user?.id || null;
  const [hydrated, setHydrated] = useState(false);
  const [pinnedKeys, setPinnedKeys] = useState<string[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [bookmarks, setBookmarks] = useState<WorkspaceBookmark[]>([]);
  const hydratingRef = useRef(false);

  const hydrate = useCallback(async () => {
    if (!userId) {
      setHydrated(false);
      setPinnedKeys([]);
      setRecentItems([]);
      setBookmarks([]);
      return;
    }
    if (hydratingRef.current) return;
    hydratingRef.current = true;
    try {
      const resp = await apiGetWorkspaceState();
      const payload = resp?.data || { pinnedServices: [], recentServices: [], bookmarks: [] };
      setPinnedKeys(
        (payload.pinnedServices || []).map((row) => row.key).filter(Boolean),
      );
      setRecentItems(normalizeRecents(payload.recentServices || []));
      setBookmarks(payload.bookmarks || []);
      setHydrated(true);
    } catch (err) {
      console.warn("WorkspaceState hydrate failed", err);
      setHydrated(false);
    } finally {
      hydratingRef.current = false;
    }
  }, [userId]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const togglePin = useCallback(async (key: string) => {
    if (!key) return;
    let wasPinned = false;
    setPinnedKeys((prev) => {
      wasPinned = prev.includes(key);
      return wasPinned ? prev.filter((k) => k !== key) : [...prev, key];
    });
    try {
      const resp = await apiTogglePinnedService(key);
      const next = Array.isArray(resp?.data) ? resp.data : [];
      setPinnedKeys(next.map((row) => row.key).filter(Boolean));
    } catch (err) {
      console.warn("togglePin failed", err);
      setPinnedKeys((prev) =>
        wasPinned
          ? prev.includes(key)
            ? prev
            : [...prev, key]
          : prev.filter((k) => k !== key),
      );
    }
  }, []);

  const recordRecent = useCallback(async (key: string) => {
    if (!key) return;
    // Optimistic local update for instant sidebar feedback
    setRecentItems((prev) => {
      if (prev[0]?.key === key) return prev;
      return [
        { key, lastVisitedAt: Date.now() },
        ...prev.filter((item) => item.key !== key),
      ].slice(0, MAX_RECENTS);
    });
    try {
      const resp = await apiRecordRecentService(key);
      if (Array.isArray(resp?.data)) {
        setRecentItems(normalizeRecents(resp.data));
      }
    } catch (err) {
      console.warn("recordRecent failed", err);
    }
  }, []);

  const addBookmark = useCallback(
    async (input: {
      serviceKey: string;
      route?: string;
      label?: string;
      payload?: unknown;
    }) => {
      const resp = await apiAddBookmark(input);
      const next = Array.isArray(resp?.data) ? resp.data : [];
      setBookmarks(next);
      return next;
    },
    [],
  );

  const removeBookmark = useCallback(async (bookmarkId: string) => {
    const resp = await apiRemoveBookmark(bookmarkId);
    const next = Array.isArray(resp?.data) ? resp.data : [];
    setBookmarks(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      hydrate,
      pinnedKeys,
      recentItems,
      bookmarks,
      togglePin,
      recordVisit: recordRecent,
      recordRecent,
      addBookmark,
      removeBookmark,
    }),
    [
      addBookmark,
      bookmarks,
      hydrate,
      hydrated,
      pinnedKeys,
      recentItems,
      recordRecent,
      removeBookmark,
      togglePin,
    ],
  );

  return (
    <WorkspaceStateContext.Provider value={value}>{children}</WorkspaceStateContext.Provider>
  );
}

export function useWorkspaceState() {
  const ctx = useContext(WorkspaceStateContext);
  if (!ctx) {
    throw new Error("useWorkspaceState must be used within WorkspaceStateProvider");
  }
  return ctx;
}
