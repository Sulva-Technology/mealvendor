import { LayoutDashboard, ShoppingBag, Clock, BookOpen, Calendar, Package, Wallet, MessageSquare, Settings } from 'lucide-react';

export const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingBag },
  { name: 'Batches', href: '/batches', icon: Clock },
  { name: 'Availability', href: '/availability', icon: Calendar },
  { name: 'Menu', href: '/menu', icon: BookOpen },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Settlements', href: '/settlements', icon: Wallet },
  { name: 'Reviews', href: '/reviews', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];
