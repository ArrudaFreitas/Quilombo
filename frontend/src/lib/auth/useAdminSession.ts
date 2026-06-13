"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch, type ApiFetchOptions } from "@/lib/api/client";
import { exchangeToken, logout, me, refreshToken } from "@/lib/api/auth";
import type { AdminFetcher } from "@/lib/api/admin";
import type { AdminMe, ApiEnvelope } from "@/lib/api/types";
import {
  clearAccessToken,
  loadAccessToken,
  saveAccessToken,
} from "./tokenStore";
import { beginLogin } from "./loginFlow";

export type AdminSession =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "ready"; user: AdminMe };

interface UseAdminSession {
  session: AdminSession;
  /** apiFetch com Bearer + renovação automática da sessão em 401. */
  adminFetch: AdminFetcher;
  /** Consome o código do callback OAuth e abre a sessão. */
  completeLogin: (code: string) => Promise<void>;
  /** Redireciona para o login Google (na raiz, lembrando o tenant). */
  login: () => void;
  signOut: () => Promise<void>;
}

/**
 * Sessão do admin no tenant atual. Na montagem tenta reabrir a sessão com o
 * access token salvo; se expirou, rotaciona pelo cookie de refresh. Qualquer
 * 401 posterior dispara uma única tentativa de refresh antes de cair para
 * "anon" — o backend revalida a allowlist a cada chamada.
 */
export function useAdminSession(slug: string): UseAdminSession {
  const [session, setSession] = useState<AdminSession>({ status: "loading" });
  const tokenRef = useRef<string | null>(null);

  const adopt = useCallback(
    (token: string) => {
      tokenRef.current = token;
      saveAccessToken(slug, token);
    },
    [slug],
  );

  const drop = useCallback(() => {
    tokenRef.current = null;
    clearAccessToken(slug);
    setSession({ status: "anon" });
  }, [slug]);

  /** Rotaciona a sessão longa; retorna o token novo ou null (sessão acabou). */
  const tryRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const { data } = await refreshToken();
      adopt(data.token);
      return data.token;
    } catch {
      return null;
    }
  }, [adopt]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const stored = loadAccessToken(slug);
      const token = stored ?? (await tryRefresh());
      if (!token) {
        if (!cancelled) setSession({ status: "anon" });
        return;
      }
      tokenRef.current = token;
      try {
        const { data } = await me(token);
        if (!cancelled) setSession({ status: "ready", user: data });
      } catch {
        const renewed = await tryRefresh();
        if (!renewed) {
          if (!cancelled) drop();
          return;
        }
        try {
          const { data } = await me(renewed);
          if (!cancelled) setSession({ status: "ready", user: data });
        } catch {
          if (!cancelled) drop();
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [slug, tryRefresh, drop]);

  const adminFetch = useCallback(
    async <T>(path: string, options?: ApiFetchOptions): Promise<ApiEnvelope<T>> => {
      try {
        return await apiFetch<T>(path, {
          ...options,
          accessToken: tokenRef.current ?? undefined,
        });
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }
        const renewed = await tryRefresh();
        if (!renewed) {
          drop();
          throw error;
        }
        return apiFetch<T>(path, { ...options, accessToken: renewed });
      }
    },
    [tryRefresh, drop],
  );

  const completeLogin = useCallback(
    async (code: string) => {
      const { data } = await exchangeToken(code);
      adopt(data.token);
      const current = await me(data.token);
      setSession({ status: "ready", user: current.data });
    },
    [adopt],
  );

  const login = useCallback(() => {
    window.location.assign(beginLogin(window.location.host));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      drop();
    }
  }, [drop]);

  return { session, adminFetch, completeLogin, login, signOut };
}
