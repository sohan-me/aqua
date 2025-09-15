'use client';

import Link from 'next/link';
import { DollarSign, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';

const accountSections = [
  {
    title: 'Expense Types',
    description: 'Manage expense categories and types',
    href: '/expense-types',
    icon: TrendingDown,
    color: 'bg-red-500 hover:bg-red-600',
  },
  {
    title: 'Income Types',
    description: 'Manage income categories and types',
    href: '/income-types',
    icon: TrendingUp,
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    title: 'Expenses',
    description: 'Track and manage expenses',
    href: '/expenses',
    icon: DollarSign,
    color: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    title: 'Income',
    description: 'Track and manage income',
    href: '/income',
    icon: CreditCard,
    color: 'bg-blue-500 hover:bg-blue-600',
  },
];

export default function AccountsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
        <p className="text-gray-600 mt-2">Manage your financial records and categories</p>
      </div>

      {/* Account Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {accountSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group block"
          >
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200 hover:border-gray-300">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${section.color} transition-colors duration-200`}>
                  <section.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                {section.title}
              </h3>
              <p className="text-gray-600 text-sm mt-2">
                {section.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Expenses</span>
              <span className="font-semibold text-red-600">- ৳0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Income</span>
              <span className="font-semibold text-green-600">+ ৳0.00</span>
            </div>
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-gray-900 font-medium">Net Profit/Loss</span>
              <span className="font-bold text-gray-900">৳0.00</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/expenses/new"
              className="block w-full text-left px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors duration-200"
            >
              + Add New Expense
            </Link>
            <Link
              href="/income/new"
              className="block w-full text-left px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors duration-200"
            >
              + Add New Income
            </Link>
            <Link
              href="/reports"
              className="block w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors duration-200"
            >
              View Financial Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
