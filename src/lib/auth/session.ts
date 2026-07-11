'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../api/types';

/**
 * Auth/session store for the vendor portal.
 *
 * Tokens are NEVER held here. The backend's access/refresh JWTs live only in
 * httpOnly cookies set by the /api/auth/* and /api/proxy routes, so browser JS
 * (and any XSS) cannot read them. This store keeps only non-sensitive session
 * facts used for rendering and onboarding gating: whether we're authed, the
 * display user, and the vendor id. The httpOnly access cookie — read by the
 * middleware — is the real gate.
 */
export interface SessionInfo {
  authed?: boolean;
  user?: AuthUser | null;
  vendorId?: string | null;
}

interface AuthState {
  authed: boolean;
  user: AuthUser | null;
  vendorId: string | null;
  /** True once the store has reconciled with the server session at least once. */
  ready: boolean;
  setSession: (info: SessionInfo) => void;
  clearSession: () => void;
  /** Reconcile with the server (optionally forcing a token refresh). */
  refreshSession: (opts?: { refresh?: boolean }) => Promise<SessionInfo>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      authed: false,
      user: null,
      vendorId: null,
      ready: false,
      setSession: (info) =>
        set((prev) => ({
          authed: info.authed ?? prev.authed,
          user: info.user === undefined ? prev.user : info.user,
          vendorId: info.vendorId === undefined ? prev.vendorId : info.vendorId,
          ready: true
        })),
      clearSession: () => set({ authed: false, user: null, vendorId: null, ready: true }),
      refreshSession: async (opts) => {
        try {
          const res = await fetch(`/api/auth/session${opts?.refresh ? '?refresh=1' : ''}`, {
            credentials: 'include',
            cache: 'no-store'
          });
          const json = await res.json().catch(() => null);
          const data = (json?.data ?? {}) as SessionInfo;
          set({
            authed: !!data.authed,
            user: (data.user as AuthUser | null) ?? null,
            vendorId: data.vendorId ?? null,
            ready: true
          });
          return data;
        } catch {
          set({ ready: true });
          return { authed: false };
        }
      }
    }),
    {
      name: 'md-vendor-session',
      // Only non-sensitive display state is persisted; authed truth is the cookie.
      partialize: (state) => ({ user: state.user, vendorId: state.vendorId, authed: state.authed })
    }
  )
);
