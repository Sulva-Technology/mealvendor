'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running on iOS inside Safari, not standalone
    const checkIos = () => {
      const isIos = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase());
      const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
      
      if (isIos && !isStandalone) {
        requestAnimationFrame(() => {
          setIsInstallable(true);
        });
      }
    };
    checkIos();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isInstallable || dismissed) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      // iOS manual instruction fallback
      alert('To install, tap the Share icon and select "Add to Home Screen".');
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-8 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="glass p-4 rounded-[var(--radius-lg)] shadow-lg flex items-center justify-between gap-4 max-w-sm ml-auto">
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-foreground)]">Install Vendor Portal</h4>
          <p className="text-xs text-[var(--color-muted-foreground)]">Add to home screen for quick access and notifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInstall}
            className="flex items-center justify-center p-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary)]/90"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setDismissed(true)}
            className="flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
