'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Clock, Menu as MenuIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const mobileNav = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingBag },
  { name: 'Batches', href: '/batches', icon: Clock },
  { name: 'More', href: '/settings', icon: MenuIcon },
];

export function VendorMobileBottomNav() {
  const pathname = usePathname();

  return (
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
      </div>
    </div>
  );
}
