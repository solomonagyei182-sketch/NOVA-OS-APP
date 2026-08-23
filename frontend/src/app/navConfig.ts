import { LayoutDashboard, ShoppingCart, Calculator, Boxes, Users, BarChart3, ShieldCheck } from 'lucide-react';
import type { Role } from '../lib/types';

export const navItems: { to: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['MANAGER', 'COUNTER'] },
  { to: '/sales', label: 'Sales', icon: ShoppingCart, roles: ['MANAGER', 'COUNTER'] },
  { to: '/calculations', label: 'Calculations', icon: Calculator, roles: ['MANAGER', 'COUNTER'] },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['MANAGER', 'COUNTER'] },
  { to: '/customers', label: 'Customers', icon: Users, roles: ['MANAGER'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['MANAGER'] },
  { to: '/admin', label: 'Admin Dashboard', icon: ShieldCheck, roles: ['MANAGER'] },
];
