import React from 'react';
import { VendorAppShell } from '@/src/components/shared/VendorAppShell';
import { QueryProvider } from '@/src/components/shared/QueryProvider';
import { VendorGuard } from '@/src/components/shared/VendorGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <VendorGuard>
        <VendorAppShell>{children}</VendorAppShell>
      </VendorGuard>
    </QueryProvider>
  );
}
