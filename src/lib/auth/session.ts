'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, AuthUser } from '../api/types';
import { getVendorIdFromToken } from './jwt';

/**
 * Auth/session store for the vendor portal.
 *
 * Tokens come from the backend's own `/auth/vendor/login` endpoint (the backend
 * wraps Supabase and issues a Supabase JWT). We persist them to localStorage and
 * also mirror a lightweight presence cookie so the Next.js middleware can gate
 * routes without reading localStorage.
 */

const COOKIE_NAME = 'md-vendor-auth';

function setAuthCookie(present: boolean) {
  if (typeof document === 'undefined') return;
  if (present) {
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=2592000; samesite=lax`;
  } else {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
  }
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  /** Vendor id from the access token's `app_metadata.vendor_id` claim, if present. */
  vendorId: string | null;
  expiresAt: number | null;
  setSession: (tokens: AuthTokens) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      vendorId: null,
      expiresAt: null,
      setSession: (tokens) => {
        setAuthCookie(true);
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: tokens.user ?? null,
          vendorId: getVendorIdFromToken(tokens.accessToken),
          expiresAt: tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : null,
        });
      },
      clearSession: () => {
        setAuthCookie(false);
        set({ accessToken: null, refreshToken: null, user: null, vendorId: null, expiresAt: null });
      },
    }),
    {
      name: 'md-vendor-session',
      onRehydrateStorage: () => (state) => {
        // Keep the middleware cookie in sync with persisted state on load, and
        // re-derive vendorId in case the persisted token changed schema.
        if (state) {
          setAuthCookie(!!state.accessToken);
          state.vendorId = getVendorIdFromToken(state.accessToken);
        }
      },
    }
  )
);

// Non-React accessors for use inside the fetch layer.
export const getAccessToken = () => useAuthStore.getState().accessToken;
export const getRefreshToken = () => useAuthStore.getState().refreshToken;
