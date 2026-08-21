const TOKEN_KEY = "dh_admin_token";
const REFRESH_KEY = "dh_admin_rt";

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefresh = () => localStorage.getItem(REFRESH_KEY);
export const setTokens = (access, refresh) => {
  if (access) localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
};
export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

async function refreshAccess() {
  const rt = getRefresh();
  if (!rt) return null;
  try {
    const r = await fetch("/api/auth/refresh-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    const j = await r.json();
    if (r.ok && j.accessToken) {
      setTokens(j.accessToken);
      return j.accessToken;
    }
  } catch {}
  return null;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body, params } = {}) {
  let token = getToken();
  const url =
    "/api" + path + (params ? "?" + new URLSearchParams(params).toString() : "");
  const doFetch = () =>
    fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });
  let res = await doFetch();
  if (res.status === 401 && token) {
    token = await refreshAccess();
    if (token) res = await doFetch();
    else {
      clearTokens();
      onUnauthorized?.();
    }
  }
  const isJson = (res.headers.get("content-type") || "").includes("json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, data?.error || "حدث خطأ");
  return data;
}
