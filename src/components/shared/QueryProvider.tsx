'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Render's free tier can be slow/cold; give queries room. Refetch on
            // focus so a vendor returning to the tab sees fresh orders/status
            // without a manual reload (staleTime still throttles the calls).
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
