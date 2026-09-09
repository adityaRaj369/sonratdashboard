import { http } from "@/services/api/http";

const BASE = "/api/v1/workspace-state";

export type WorkspacePinned = { key: string; pinnedAt?: string };
export type WorkspaceRecent = { key: string; lastVisitedAt: string | number };
export type WorkspaceBookmark = {
  id?: string;
  _id?: string;
  serviceKey: string;
  route?: string;
  label?: string;
  payload?: unknown;
  savedAt?: string;
};

export type WorkspaceStatePayload = {
  pinnedServices: WorkspacePinned[];
  recentServices: WorkspaceRecent[];
  bookmarks: WorkspaceBookmark[];
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string; code?: string };

export async function getWorkspaceState() {
  return http.get<ApiEnvelope<WorkspaceStatePayload>>(BASE);
}

export async function recordRecentService(key: string) {
  return http.post<ApiEnvelope<WorkspaceRecent[]>>(`${BASE}/recent`, { key });
}

export async function togglePinnedService(key: string) {
  return http.post<ApiEnvelope<WorkspacePinned[]>>(`${BASE}/pins/toggle`, { key });
}

export async function addBookmark(input: {
  serviceKey: string;
  route?: string;
  label?: string;
  payload?: unknown;
}) {
  return http.post<ApiEnvelope<WorkspaceBookmark[]>>(`${BASE}/bookmarks`, input);
}

export async function removeBookmark(bookmarkId: string) {
  return http.delete<ApiEnvelope<WorkspaceBookmark[]>>(`${BASE}/bookmarks/${bookmarkId}`);
}
