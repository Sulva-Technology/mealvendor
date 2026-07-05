'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Clock, Menu as MenuIcon, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { VendorSidebar } from './VendorSidebar';

const mobileNav = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingBag },
  { name: 'Batches', href: '/batches', icon: Clock },
];

export function VendorMobileBottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change (a nav item was tapped).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <>
      <div className="md:hidden fixed bottom-0 w-full z-50 glass pb-safe border-t rounded-t-[var(--radius-xl)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          {mobileNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={twMerge(
                  clsx(
                    'flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors',
                    isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]'
                  )
                )}
              >
                <Icon className={clsx('h-6 w-6', isActive && 'fill-[var(--color-primary)]/10')} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawerOpen((o) => !o)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className={twMerge(
              clsx(
                'flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors',
                drawerOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]'
              )
            )}
          >
            <MenuIcon className="h-6 w-6" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>

      {drawerOpen &&
        createPortal(
          <div className="md:hidden fixed inset-0 z-[60]">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            {/* Slide-in panel */}
            <div className="absolute inset-y-0 left-0 w-64 max-w-[80%] flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="absolute top-4 right-3 z-10 p-1.5 rounded-md text-[var(--color-muted-foreground)] hover:bg-black/5"
              >
                <X className="h-5 w-5" />
              </button>
              <VendorSidebar />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
