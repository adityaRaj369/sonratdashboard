import { http } from "./http";
import type { AuthMeResponse, AuthOrganization } from "@/lib/types";

const BASE = "/api/v1/auth";

export const authApi = {
  me: () => http.get<AuthMeResponse>(`${BASE}/me`),
  login: (body: { email: string; password: string }) =>
    http.post<{ user: AuthMeResponse["user"]; organization: AuthOrganization | null }>(
      `${BASE}/login`,
      body,
    ),
  register: (body: {
    email: string;
    password: string;
    name: string;
    organizationName: string;
  }) =>
    http.post<{ user: AuthMeResponse["user"]; organization: AuthOrganization }>(
      `${BASE}/register`,
      body,
    ),
  logout: () => http.post<void>(`${BASE}/logout`),
  switchOrganization: (organizationId: string) =>
    http.post<{ organization: AuthOrganization }>(`${BASE}/switch-org`, {
      organizationId,
    }),
};
