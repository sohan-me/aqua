'use client';

import { useParams, useRouter } from 'next/navigation';
import { useStockingById } from '@/hooks/useApi';
import { ArrowLeft, Edit, Trash2, Fish, Calendar, Package, Weight, Calculator } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import Link from 'next/link';

export default function StockingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const stockingId = parseInt(params.id as string);
  console.log(stockingId);
  const { data: stocking, isLoading } = useStockingById(stockingId);

  console.log(stocking);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stocking) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Stocking Record Not Found</h2>
        <p className="text-gray-600 mb-6">The stocking record you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/stocking')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stocking
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
            <h1 className="text-3xl font-bold text-gray-900">Stocking Details</h1>
            <p className="text-gray-600 mt-1">
              {stocking.data.species_name} in {stocking.data.pond_name}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href={`/stocking/${stockingId}/edit`}
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
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Stocking Date</p>
              <p className="text-2xl font-semibold text-gray-900">{formatDate(stocking.data.date)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Pieces</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(stocking.data.pcs, 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Weight className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Weight</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(parseFloat(stocking.data.total_weight_kg), 3)} kg</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calculator className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Weight</p>
              <p className="text-2xl font-semibold text-gray-900">{formatNumber(parseFloat(stocking.data.initial_avg_weight_kg), 4)} kg</p>
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
              <span className="text-sm text-gray-500">Pond:</span>
              <span className="text-sm font-medium">{stocking.data.pond_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Species:</span>
              <span className="text-sm font-medium">{stocking.data.species_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Stocking Date:</span>
              <span className="text-sm font-medium">{formatDate(stocking.data.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created:</span>
              <span className="text-sm font-medium">{formatDate(stocking.data.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stocking Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Number of Pieces:</span>
              <span className="text-sm font-medium">{formatNumber(stocking.data.pcs, 0)} pieces</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Weight:</span>
              <span className="text-sm font-medium">{formatNumber(parseFloat(stocking.data.total_weight_kg), 3)} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Pieces per kg:</span>
              <span className="text-sm font-medium">{stocking.data.pieces_per_kg} pcs/kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Initial Avg Weight:</span>
              <span className="text-sm font-medium">{formatNumber(parseFloat(stocking.data.initial_avg_weight_kg), 4)} kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {stocking.data.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{stocking.data.notes}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            href={`/stocking/${stockingId}/edit`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Edit Stocking</span>
          </Link>
          
          <Link
            href={`/ponds/${stocking.data.pond}`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Fish className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-sm font-medium">View Pond</span>
          </Link>
          
          <Link
            href="/stocking"
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Package className="h-6 w-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium">All Stocking</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
