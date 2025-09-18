'use client';

import { useParams, useRouter } from 'next/navigation';
import { useIncomeById } from '@/hooks/useApi';
import { ArrowLeft, Edit, DollarSign, Calendar, Receipt, Users, Package } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import Link from 'next/link';

export default function IncomeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const incomeId = parseInt(params.id as string);
  
  const { data: income, isLoading } = useIncomeById(incomeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!income) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Income Record Not Found</h2>
        <p className="text-gray-600 mb-6">The income record you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/income')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Income
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
            <h1 className="text-3xl font-bold text-gray-900">Income Record Details</h1>
            <p className="text-gray-600 mt-1">
              {income.data.income_type_name} - {formatDate(income.data.date)}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href={`/income/${incomeId}/edit`}
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
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Amount</p>
              <p className="text-2xl font-semibold text-black">৳{parseFloat(income.data.amount).toFixed(4)}</p>
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
              <p className="text-2xl font-semibold text-black">{income.data.income_type_name}</p>
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
                {income.data.quantity ? `${parseFloat(income.data.quantity).toFixed(4)} ${income.data.unit}` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Customer</p>
              <p className="text-2xl font-semibold text-black">
                {income.data.customer || 'N/A'}
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
              <span className="text-sm text-gray-500">Income Type:</span>
              <span className="text-sm font-medium">{income.data.income_type_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Pond:</span>
              <span className="text-sm font-medium">{income.data.pond_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="text-sm font-medium">{formatDate(income.data.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Amount:</span>
              <span className="text-sm font-medium">৳{parseFloat(income.data.amount).toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created:</span>
              <span className="text-sm font-medium">{formatDate(income.data.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Quantity:</span>
              <span className="text-sm font-medium">
                {income.data.quantity ? `${parseFloat(income.data.quantity).toFixed(4)} ${income.data.unit}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Unit:</span>
              <span className="text-sm font-medium">{income.data.unit || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Customer:</span>
              <span className="text-sm font-medium">{income.data.customer || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">User:</span>
              <span className="text-sm font-medium">{income.data.user_username}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {income.data.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{income.data.notes}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            href={`/income/${incomeId}/edit`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Edit Record</span>
          </Link>
          
          {income.data.pond && (
            <Link
              href={`/ponds/${income.data.pond}`}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Receipt className="h-6 w-6 text-green-600 mb-2" />
              <span className="text-sm font-medium">View Pond</span>
            </Link>
          )}
          
          <Link
            href="/income"
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <DollarSign className="h-6 w-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium">All Income</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
