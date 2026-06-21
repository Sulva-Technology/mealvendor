'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export function AppUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.ready.then((registration) => {
        // Detect if there's already a waiting worker
        if (registration.waiting) {
          setUpdateAvailable(true);
          setWaitingWorker(registration.waiting);
        }

        // Listen for new workers
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              setWaitingWorker(newWorker);
            }
          });
        });
      });
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    // Listen for the controllerchange event to reload the page
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
    
    // Fallback reload if controllerchange doesn't fire
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-gray-900 text-white rounded-xl shadow-2xl p-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-semibold text-sm mb-1">New Version Available</h4>
          <p className="text-xs text-gray-300">
            An update was downloaded in the background. Refresh to use the latest version.
          </p>
        </div>
        <button 
          onClick={handleDismiss}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss update"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleUpdate}
          className="flex-1 bg-white text-gray-900 hover:bg-gray-100 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Update now
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 border border-gray-700 hover:bg-gray-800 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
