'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Home,
  Fish,
  DollarSign,
  BarChart3,
  Settings,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  FileText,
  Menu,
  X,
  Scale,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Target,
  Stethoscope,
  Building2,
  Truck,
  Receipt,
  Wallet,
  Banknote,
  UserCheck,
  ClipboardList,
  Archive,
  ShoppingCart,
  BookOpen,
  PieChart,
  TrendingUp as TrendingUpIcon,
  AlertCircle,
  Tag,
  Wrench,
  Calculator,
} from 'lucide-react';
import Image from 'next/image';

const navigation = [
  { name: 'Analytics Dashboard', href: '/analytics', icon: BarChart3 },
  
  // Master Data
  {
    name: 'Master Data',
    href: '/master-data',
    icon: Building2,
    submenu: [
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Vendors', href: '/vendors', icon: Truck },
      { name: 'Payment Terms', href: '/payment-terms', icon: Receipt },
      { name: 'Feed Types', href: '/feed-types', icon: Package },
      { name: 'Expense Types', href: '/expense-types', icon: TrendingDown },
      { name: 'Income Types', href: '/income-types', icon: TrendingUp },
    ]
  },

  // Aquaculture Operations
  {
    name: 'Aquaculture',
    href: '/aquaculture',
    icon: Fish,
    submenu: [
      { name: 'Ponds', href: '/ponds', icon: Fish },
      { name: 'Species', href: '/species', icon: Fish },
      { name: 'Inventory Management', href: '/inventory', icon: Archive },
      { name: 'Fish Stocking', href: '/stocking-events', icon: Package },
      { name: 'Feeding Events', href: '/feeding-events', icon: Activity },
      { name: 'Medicine Events', href: '/medicine-events', icon: Stethoscope },
      { name: 'Other Pond Events', href: '/other-pond-events', icon: Calendar },
    ]
  },

  // Accounting
  {
    name: 'Accounting',
    href: '/accounting',
    icon: DollarSign,
    submenu: [
      { name: 'Chart of Accounts', href: '/chart-accounts', icon: BookOpen },
      { name: 'Fund Transfer', href: '/chart-accounts/transfer', icon: Calculator },
      { name: 'Items & Services', href: '/items', icon: Package },
      { name: 'Bills (AP)', href: '/bills', icon: Receipt },
      { name: 'Bill Payments', href: '/bill-payments', icon: Banknote },
      { name: 'Invoices (AR)', href: '/invoices', icon: FileText },
      { name: 'Customer Payments', href: '/customer-payments', icon: Wallet },
      { name: 'Deposits', href: '/deposits', icon: Wallet },
    ]
  },

  // Employee Management
  {
    name: 'Employees',
    href: '/employees',
    icon: UserCheck,
    submenu: [
      { name: 'Employee List', href: '/employees', icon: Users },
      { name: 'Payroll', href: '/payroll', icon: DollarSign },
    ]
  },

  // Monitoring & Analysis
  {
    name: 'Monitoring',
    href: '/monitoring',
    icon: Activity,
    submenu: [
      { name: 'Daily Logs', href: '/daily-logs', icon: Calendar },
      { name: 'Fish Sampling', href: '/fish-sampling', icon: Scale },
      { name: 'Mortality', href: '/mortality', icon: TrendingDown },
      { name: 'Harvest', href: '/harvest', icon: TrendingUp },
      { name: 'Water Quality', href: '/water-quality', icon: Activity },
    ]
  },

  // Medical
  {
    name: 'Medical',
    href: '/medical',
    icon: Stethoscope,
    submenu: [
      { name: 'Medical Diagnostic', href: '/medical-diagnostic', icon: Stethoscope },
      { name: 'Quick Diagnosis', href: '/quick-diagnosis', icon: Stethoscope },
      { name: 'Treatment History', href: '/medical-diagnostics', icon: Stethoscope },
    ]
  },

  // Reports & Analysis
  {
    name: 'Reports',
    href: '/reports',
    icon: PieChart,
    submenu: [
      { name: 'Financial Reports', href: '/reports', icon: DollarSign },
      { name: 'FCR Analysis', href: '/reports/fcr', icon: Scale },
      { name: 'Biomass Analysis', href: '/reports/biomass', icon: BarChart3 },
      { name: 'Profit & Loss', href: '/reports/pnl', icon: TrendingUpIcon },
      { name: 'Balance Sheet', href: '/reports/balance-sheet', icon: FileText },
    ]
  },

  // Tools
  {
    name: 'Tools',
    href: '/tools',
    icon: Wrench,
    submenu: [
      { name: 'Feeding Advice', href: '/feeding-advice', icon: Lightbulb },
      { name: 'Target Biomass', href: '/reports/target-biomass', icon: Target },
      { name: 'Asset Calculator', href: '/asset-calculator', icon: Calculator },
    ]
  },

  // Settings
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-800 transition-transform duration-300 ease-in-out shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header with close button for mobile */}
        <div className="flex h-40 items-center justify-between border-b border-slate-700/50 mt-6 px-4">
          <div className="flex items-center space-x-2">
            <Image src="/logo.png" alt="AquaFarm Pro" width={150} height={100} />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 -mt-24 hover:text-white transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.submenu && item.submenu.some(sub => pathname === sub.href));
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenus.includes(item.name);
            
            return (
              <div key={item.name}>
                {hasSubmenu ? (
                  <button
                    style={{color: 'white'}}
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      'group flex items-center justify-between w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                        : 'text-white hover:text-white hover:bg-slate-700/50'
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon
                        style={{color: 'white'}}
                        className={cn(
                          'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200',
                          isActive ? 'text-white' : 'text-white group-hover:text-white'
                        )}
                      />
                      {item.name}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-white" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white" />
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    style={{color: 'white'}}
                    onClick={onClose}
                    className={cn(
                      'group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                        : 'text-white hover:text-white hover:bg-slate-700/50'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200',
                        isActive ? 'text-white' : 'text-white group-hover:text-white'
                      )}
                    />
                    {item.name}
                  </Link>
                )}
                
                {hasSubmenu && isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.submenu.map((subItem) => {
                      const isSubActive = pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          style={{color: 'white'}}
                          onClick={onClose}
                          className={cn(
                            'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                            isSubActive
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                              : 'text-gray-300 hover:text-white hover:bg-slate-600/50'
                          )}
                        >
                          <subItem.icon
                          style={{color: 'white'}}
                            className={cn(
                              'mr-3 h-4 w-4 flex-shrink-0 transition-colors duration-200',
                              isSubActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                            )}
                          />
                          {subItem.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        
        {/* <div className="border-t border-slate-700/50 p-4">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-gray-400">admin@example.com</p>
            </div>
          </div>
        </div> */}
      </div>
    </>
  );
}
