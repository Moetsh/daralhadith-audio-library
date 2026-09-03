import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, getRefresh, setTokens, clearTokens, setUnauthorizedHandler } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    try {
      const me = await api("/auth/me");
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    load();
  }, [load]);

  const login = async (email, password) => {
    const r = await api("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setTokens(r.accessToken, r.refreshToken);
    setUser(r.user);
    return r.user;
  };

  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST", body: { refreshToken: getRefresh() || undefined } });
    } catch {}
    clearTokens();
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, ready, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
