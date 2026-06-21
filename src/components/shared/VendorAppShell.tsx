'use client';

import React from 'react';
import { VendorSidebar } from './VendorSidebar';
import { VendorTopBar } from './VendorTopBar';
import { VendorMobileBottomNav } from './VendorMobileBottomNav';
import { InstallPrompt } from './InstallPrompt';
import { AppUpdatePrompt } from './AppUpdatePrompt';

export function VendorAppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
        <VendorSidebar />
      </div>

      <div className="flex flex-col flex-1 w-full md:pl-64">
        {/* Topbar */}
        <VendorTopBar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <VendorMobileBottomNav />
      
      {/* PWA Install Prompt */}
      <InstallPrompt />
      <AppUpdatePrompt />
    </div>
  );
}
