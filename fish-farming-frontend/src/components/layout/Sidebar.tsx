'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Home,
  Fish,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Settings,
  Droplets,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  FileText,
  TestTube,
  Menu,
  X,
  Scale,
  Lightbulb,
} from 'lucide-react';
import Image from 'next/image';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Ponds', href: '/ponds', icon: Fish },
  { name: 'Species', href: '/species', icon: Fish },
  { name: 'Stocking', href: '/stocking', icon: Package },
  { name: 'Daily Logs', href: '/daily-logs', icon: Calendar },
  { name: 'Water Quality', href: '/water-quality', icon: Droplets },
  { name: 'Water Sample Types', href: '/sample-types', icon: TestTube },
  { name: 'Fish Sampling', href: '/fish-sampling', icon: Scale },
  { name: 'Feeding Advice', href: '/feeding-advice', icon: Lightbulb },
  { name: 'Mortality', href: '/mortality', icon: TrendingDown },
  { name: 'Feed Types', href: '/feed-types', icon: Package },
  { name: 'Feeding', href: '/feeding', icon: Activity },
  { name: 'Harvest', href: '/harvest', icon: TrendingUp },
  { name: 'Expense Types', href: '/expense-types', icon: DollarSign },
  { name: 'Income Types', href: '/income-types', icon: DollarSign },
  { name: 'Expenses', href: '/expenses', icon: DollarSign },
  { name: 'Income', href: '/income', icon: DollarSign },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Reports', href: '/reports', icon: FileText },
  // { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

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
        "fixed lg:static inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-black transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header with close button for mobile */}
        <div className="flex h-30 items-center justify-between border-b border-gray-700 mt-6 px-4">
          <div className="flex items-center space-x-2">
            <Image src="/logo.png" alt="FishFarm" width={150} height={150} />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 -mt-24 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose} // Close sidebar on mobile when link is clicked
                className={cn(
                  'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'hover:text-white'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-300'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-gray-400">admin@example.com</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
