'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { navigation } from '@/src/config/navigation';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function VendorSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex-1 flex flex-col min-h-0 glass border-r">
      <div className="flex items-center h-16 shrink-0 px-6 bg-white/50 border-b border-[var(--color-border)]">
        {/* Brand */}
        <Image
          src="/logo.png"
          alt="Meal Direct"
          width={32}
          height={32}
          className="h-8 w-8 rounded-lg shadow-sm"
        />
        <span className="ml-3 font-semibold text-lg text-[var(--color-primary)] tracking-tight">Meal Direct</span>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        <p className="px-2 text-xs font-semibold text-[var(--color-muted-foreground)] tracking-wider uppercase mb-4">Vendor Portal</p>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={twMerge(
                clsx(
                  'group flex items-center px-2 py-2.5 text-sm font-medium rounded-[var(--radius-md)] transition-all duration-200',
                  isActive 
                    ? 'bg-[var(--color-primary)] text-white shadow-md' 
                    : 'text-[var(--color-foreground)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)]'
                )
              )}
            >
              <Icon
                className={clsx(
                  'mr-3 shrink-0 h-5 w-5',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-[var(--color-primary)]'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
