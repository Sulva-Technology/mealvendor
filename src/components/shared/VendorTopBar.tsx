'use client';

import React from 'react';
import { Bell, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/src/lib/auth/session';
import { notificationsApi, profileApi, qk } from '@/src/lib/api/vendor';

export function VendorTopBar() {
  const user = useAuthStore((s) => s.user);

  const { data: profile } = useQuery({
    queryKey: qk.profile(),
    queryFn: profileApi.get,
    staleTime: 5 * 60_000,
  });

  const { data: notifications } = useQuery({
    queryKey: qk.notifications(),
    queryFn: notificationsApi.list,
    staleTime: 60_000,
  });

  const unread = notifications?.filter((n) => !n.readAt).length ?? 0;
  const displayName =
    profile?.displayName || (user?.email as string | undefined) || 'Vendor';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-[var(--color-border)] glass px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile Brand */}
      <div className="flex md:hidden items-center flex-1">
        <Image
          src="/icon-192.png"
          alt="Meal Direct"
          width={28}
          height={28}
          className="h-7 w-7 rounded-lg mr-2"
        />
        <span className="font-semibold text-[var(--color-primary)] tracking-tight">Meal Direct</span>
      </div>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end items-center">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <Link
            href="/notifications"
            className="-m-2.5 relative p-2.5 text-gray-400 hover:text-[var(--color-primary)] transition-colors"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

          <Link href="/settings" className="flex items-center gap-x-4 cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-semibold border border-[var(--color-primary)]/20">
              {initial && initial !== 'V' ? (
                <span className="text-sm">{initial}</span>
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <span className="hidden lg:flex flex-col">
              <span className="text-sm font-semibold leading-6 text-[var(--color-foreground)] max-w-[160px] truncate">
                {displayName}
              </span>
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
