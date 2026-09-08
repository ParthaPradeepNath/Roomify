"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthContext as AuthContextType } from "@/lib/types";
import { getCurrentUser, getStoredUser, logout as requestLogout } from "@/lib/api";

const DEFAULT_AUTH_STATE: AuthContextType = {
  isSignedIn: false,
  userName: null,
  userId: null,
  refreshAuth: async () => false,
  signIn: async () => false,
  signOut: async () => false,
};

const AuthContext = createContext<AuthContextType>(DEFAULT_AUTH_STATE);

let authModalOpener: (() => void) | null = null;

export const setAuthModalOpener = (fn: (() => void) | null) => {
  authModalOpener = fn;
};

const requireAuthModal = () => {
  authModalOpener?.();
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<
    Omit<AuthContextType, "refreshAuth" | "signIn" | "signOut">
  >(() => {
    if (typeof window === "undefined") {
      return { isSignedIn: false, userName: null, userId: null };
    }
    const stored = getStoredUser();
    return {
      isSignedIn: Boolean(stored),
      userName: stored?.name ?? null,
      userId: stored?.id ?? null,
    };
  });

  const refreshAuth = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      setAuthState({
        isSignedIn: !!user,
        userName: user?.name ?? null,
        userId: user?.id ?? null,
      });
      return !!user;
    } catch {
      setAuthState({ isSignedIn: false, userName: null, userId: null });
      return false;
    }
  }, []);

  const signIn = useCallback(async () => {
    requireAuthModal();
    return false;
  }, []);

  const signOut = useCallback(async () => {
    await requestLogout();
    return await refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    let isActive = true;
    getCurrentUser().then((user) => {
      if (!isActive) return;
      setAuthState({
        isSignedIn: !!user,
        userName: user?.name ?? null,
        userId: user?.id ?? null,
      });
    });
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, refreshAuth, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);