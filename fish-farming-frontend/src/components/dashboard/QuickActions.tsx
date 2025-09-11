'use client';

import Link from 'next/link';
import { Plus, Fish, DollarSign, Calendar, AlertTriangle, FileText } from 'lucide-react';

const quickActions = [
  {
    title: 'Add New Pond',
    description: 'Create a new pond',
    href: '/ponds/new',
    icon: Plus,
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    title: 'Record Stocking',
    description: 'Add fish stocking data',
    href: '/stocking/new',
    icon: Fish,
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    title: 'Add Expense',
    description: 'Record an expense',
    href: '/expenses/new',
    icon: DollarSign,
    color: 'bg-red-500 hover:bg-red-600',
  },
  {
    title: 'Add Income',
    description: 'Record income',
    href: '/income/new',
    icon: DollarSign,
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    title: 'Daily Log',
    description: 'Record daily activities',
    href: '/daily-logs/new',
    icon: Calendar,
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    title: 'View Alerts',
    description: 'Check system alerts',
    href: '/alerts',
    icon: AlertTriangle,
    color: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    title: 'P&L Reports',
    description: 'Profit & Loss analysis',
    href: '/reports',
    icon: FileText,
    color: 'bg-indigo-500 hover:bg-indigo-600',
  },
];

export function QuickActions() {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid md:grid-cols-2 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="flex items-center space-x-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className={`rounded-full p-2 text-white ${action.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{action.title}</p>
                <p className="text-xs text-gray-500">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
