import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Meal Direct Vendor',
  description: 'Manage your Meal Direct store, orders, and inventory.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Meal Direct Vendor',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#065f46',
};

// device-width × device-height (CSS px) × pixel-ratio per iPhone family, portrait.
const APPLE_SPLASH = [
  { media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)' }, // SE, 8, 7, 6s
  { media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)' }, // X, XS, 11 Pro, 12/13 mini
  { media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)' }, // 12, 13, 14
  { media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)' }, // 14 Pro, 15, 16
  { media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)' }, // XR, 11
  { media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)' }, // XS Max, 11 Pro Max
  { media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)' }, // 12/13/14 Pro Max
  { media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)' }, // 14/15/16 Pro Max
] as const;

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={inter.variable}>
      {/* iOS PWA launch screens — React hoists these <link> tags into <head>.
          iOS picks by media match (no scaling), so list the common iPhone sizes. */}
      {APPLE_SPLASH.map((s) => (
        <link
          key={s.media}
          rel="apple-touch-startup-image"
          href="/splash.png"
          media={s.media}
        />
      ))}
      <body className="antialiased font-sans" suppressHydrationWarning>
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('ServiceWorker registration successful');
                }, function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
