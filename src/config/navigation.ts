import { LayoutDashboard, ShoppingBag, Clock, BookOpen, Calendar, Package, Wallet, MessageSquare, Settings, Printer } from 'lucide-react';
import type { FeatureFlagKey } from '@/src/lib/hooks/useFeatureFlag';

export const navigation: {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Only shown when this server feature flag is on for the vendor. */
  flag?: FeatureFlagKey;
}[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingBag },
  { name: 'Batches', href: '/batches', icon: Clock },
  { name: 'Availability', href: '/availability', icon: Calendar },
  { name: 'Menu', href: '/menu', icon: BookOpen },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Settlements', href: '/settlements', icon: Wallet },
  { name: 'Reviews', href: '/reviews', icon: MessageSquare },
  { name: 'Printers', href: '/printers', icon: Printer, flag: 'cloud_printing' },
  { name: 'Settings', href: '/settings', icon: Settings },
];
