import {
  API_URL,
  AUTH_TOKEN_STORAGE_KEY as TOKEN_KEY,
  AUTH_USER_STORAGE_KEY as USER_KEY,
} from "./constants";

export { API_URL, TOKEN_KEY, USER_KEY };

export const isInHouseConfigured = () => Boolean(API_URL);

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string | null) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};
export const getStoredUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: string; email: string; name: string | null };
  } catch {
    return null;
  }
};
export const setStoredUser = (user: { id: string; email: string; name: string | null } | null) => {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

const request = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // ignore non-JSON errors
    }
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
};

// ---- Auth -------------------------------------------------------------

export const register = async ({
  email,
  name,
  password,
}: {
  email: string;
  name?: string;
  password: string;
}) => {
  const data = await request<{
    token: string;
    user: { id: string; email: string; name: string | null };
  }>("/api/auth/register", {
    method: "POST",
    auth: false,
    body: { email, name, password },
  });
  setToken(data.token);
  setStoredUser(data.user);
  return data.user;
};

export const login = async ({ email, password }: { email: string; password: string }) => {
  const data = await request<{
    token: string;
    user: { id: string; email: string; name: string | null };
  }>("/api/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
  setToken(data.token);
  setStoredUser(data.user);
  return data.user;
};

export const logout = async () => {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore — token is cleared regardless
  }
  setToken(null);
  setStoredUser(null);
};

export const getCurrentUser = async () => {
  if (!getToken()) return null;
  try {
    const data = await request<{ user: { id: string; email: string; name: string | null } }>(
      "/api/auth/me",
    );
    setStoredUser(data.user);
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      setToken(null);
      setStoredUser(null);
    }
    return null;
  }
};

// ---- Projects ----------------------------------------------------------

export const createProject = async ({ item, visibility = "private" }: CreateProjectParams) => {
  const data = await request<{ saved: boolean; project?: DesignItem }>("/api/projects/save", {
    method: "POST",
    body: { project: item, visibility },
  });
  return data?.project ?? null;
};

export const getProjects = async () => {
  const data = await request<{ projects?: DesignItem[] }>("/api/projects/list");
  return Array.isArray(data?.projects) ? data.projects : [];
};

export const getProjectById = async ({ id }: { id: string }) => {
  const data = await request<{ project?: DesignItem }>(
    `/api/projects/get?id=${encodeURIComponent(id)}`,
  );
  return data?.project ?? null;
};

// ---- AI ----------------------------------------------------------------

export const generate3DView = async ({
  sourceImage,
  model,
}: Generate3DViewParams): Promise<Generate3DViewResult> => {
  return request<Generate3DViewResult>("/api/ai/render", {
    method: "POST",
    body: { sourceImage, model },
  });
};

// ---- Auth modal orchestration ------------------------------------------

type AuthModalOpener = () => void;
let authModalOpener: AuthModalOpener | null = null;

export const setAuthModalOpener = (fn: AuthModalOpener | null) => {
  authModalOpener = fn;
};

export const requireAuthModal = () => {
  authModalOpener?.();
};

export const signIn = async () => {
  requireAuthModal();
  return false;
};
