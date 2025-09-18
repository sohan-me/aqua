'use client';

import { useParams, useRouter } from 'next/navigation';
import { useExpenseById } from '@/hooks/useApi';
import { ArrowLeft, Edit, DollarSign, Calendar, Receipt, Building2, Package } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import Link from 'next/link';

export default function ExpenseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = parseInt(params.id as string);
  
  const { data: expense, isLoading } = useExpenseById(expenseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Expense Record Not Found</h2>
        <p className="text-gray-600 mb-6">The expense record you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/expenses')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Expenses
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Record Details</h1>
            <p className="text-gray-600 mt-1">
              {expense.data.expense_type_name} - {formatDate(expense.data.date)}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href={`/expenses/${expenseId}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Amount</p>
              <p className="text-2xl font-semibold text-black">৳{parseFloat(expense.data.amount).toFixed(4)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Receipt className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Type</p>
              <p className="text-2xl font-semibold text-black">{expense.data.expense_type_name}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Quantity</p>
              <p className="text-2xl font-semibold text-black">
                {expense.data.quantity ? `${parseFloat(expense.data.quantity).toFixed(4)} ${expense.data.unit}` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Supplier</p>
              <p className="text-2xl font-semibold text-black">
                {expense.data.supplier || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Expense Type:</span>
              <span className="text-sm font-medium">{expense.data.expense_type_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Pond:</span>
              <span className="text-sm font-medium">{expense.data.pond_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="text-sm font-medium">{formatDate(expense.data.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Amount:</span>
              <span className="text-sm font-medium">৳{parseFloat(expense.data.amount).toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created:</span>
              <span className="text-sm font-medium">{formatDate(expense.data.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Quantity:</span>
              <span className="text-sm font-medium">
                {expense.data.quantity ? `${parseFloat(expense.data.quantity).toFixed(4)} ${expense.data.unit}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Unit:</span>
              <span className="text-sm font-medium">{expense.data.unit || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Supplier:</span>
              <span className="text-sm font-medium">{expense.data.supplier || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">User:</span>
              <span className="text-sm font-medium">{expense.data.user_username}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {expense.data.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{expense.data.notes}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            href={`/expenses/${expenseId}/edit`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Edit Record</span>
          </Link>
          
          {expense.data.pond && (
            <Link
              href={`/ponds/${expense.data.pond}`}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Receipt className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-sm font-medium">View Pond</span>
            </Link>
          )}
          
          <Link
            href="/expenses"
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <DollarSign className="h-6 w-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium">All Expenses</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
