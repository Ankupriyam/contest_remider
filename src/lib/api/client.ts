import type { ContestResponse, UserPreferencesPayload, UserProfile } from "@/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getSession: () =>
    request<{ authenticated: boolean; user?: UserProfile }>("/api/auth/session"),
  signOut: () => request<{ success: boolean }>("/api/auth/signout", { method: "POST" }),
  getUser: () => request<UserProfile>("/api/user"),
  updatePreferences: (payload: UserPreferencesPayload) =>
    request<UserProfile>("/api/user/preferences", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getContests: () => request<{ contests: ContestResponse[] }>("/api/contests"),
  syncCalendar: () =>
    request<{ synced: number; updated: number; failed: number }>("/api/calendar/sync", {
      method: "POST",
    }),
};
