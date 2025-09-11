'use client';

import { useParams, useRouter } from 'next/navigation';
import { useHarvestById } from '@/hooks/useApi';
import { ArrowLeft, Edit, Fish, Scale, DollarSign, Calendar, Package, Calculator } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import Link from 'next/link';

export default function HarvestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const harvestId = parseInt(params.id as string);
  
  const { data: harvest, isLoading } = useHarvestById(harvestId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!harvest) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Harvest Record Not Found</h2>
        <p className="text-gray-600 mb-6">The harvest record you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/harvest')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Harvest
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
            <h1 className="text-3xl font-bold text-gray-900">Harvest Record Details</h1>
            <p className="text-gray-600 mt-1">
              {harvest.data.pond_name} - {formatDate(harvest.data.date)}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href={`/harvest/${harvestId}/edit`}
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
              <Scale className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Weight</p>
              <p className="text-2xl font-semibold text-gray-900">{harvest.data.total_weight_kg} kg</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Fish Count</p>
              <p className="text-2xl font-semibold text-gray-900">{harvest.data.total_count?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Weight</p>
              <p className="text-2xl font-semibold text-gray-900">
                {harvest.data.avg_weight_g ? `${(parseFloat(harvest.data.avg_weight_g) / 1000).toFixed(3)} kg` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {harvest.data.total_revenue ? `৳${harvest.data.total_revenue}` : 'N/A'}
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
              <span className="text-sm text-gray-500">Pond:</span>
              <span className="text-sm font-medium">{harvest.data.pond_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="text-sm font-medium">{formatDate(harvest.data.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created:</span>
              <span className="text-sm font-medium">{formatDate(harvest.data.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Harvest Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Weight:</span>
              <span className="text-sm font-medium">{harvest.data.total_weight_kg} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Fish Count:</span>
              <span className="text-sm font-medium">{harvest.data.total_count?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Average Weight:</span>
              <span className="text-sm font-medium">
                {harvest.data.avg_weight_g ? `${(parseFloat(harvest.data.avg_weight_g) / 1000).toFixed(3)} kg` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Price per kg:</span>
              <span className="text-sm font-medium">
                {harvest.data.price_per_kg ? `৳${harvest.data.price_per_kg}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Revenue:</span>
              <span className="text-sm font-medium">
                {harvest.data.total_revenue ? `৳${harvest.data.total_revenue}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      {harvest.data.price_per_kg && harvest.data.total_revenue && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Revenue Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-green-700">Total Weight</p>
              <p className="text-2xl font-bold text-green-900">{harvest.data.total_weight_kg} kg</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-700">Price per kg</p>
              <p className="text-2xl font-bold text-green-900">৳{harvest.data.price_per_kg}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-green-700">Total Revenue</p>
              <p className="text-2xl font-bold text-green-900">৳{harvest.data.total_revenue}</p>
            </div>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {harvest.data.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{harvest.data.notes}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            href={`/harvest/${harvestId}/edit`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Edit Record</span>
          </Link>
          
          <Link
            href={`/ponds/${harvest.data.pond}`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Fish className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-sm font-medium">View Pond</span>
          </Link>
          
          <Link
            href="/harvest"
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Scale className="h-6 w-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium">All Harvests</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
