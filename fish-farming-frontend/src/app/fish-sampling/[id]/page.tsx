'use client';

import { useFishSamplingById, useDeleteFishSampling } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';
import { Scale, ArrowLeft, Edit, Trash2, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PageProps {
  params: {
    id: string;
  };
}

export default function FishSamplingDetailPage({ params }: PageProps) {
  const router = useRouter();
  const samplingId = parseInt(params.id as string);
  
  const { data: sampling, isLoading } = useFishSamplingById(samplingId);
  const deleteSampling = useDeleteFishSampling();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this fish sampling record?')) {
      try {
        await deleteSampling.mutateAsync(samplingId);
        toast.success('Fish sampling record deleted successfully');
        router.push('/fish-sampling');
      } catch (error) {
        toast.error('Failed to delete fish sampling record');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!sampling) {
    return (
      <div className="text-center py-12">
        <Scale className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Fish sampling not found</h3>
        <p className="mt-1 text-sm text-gray-500">The fish sampling record you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link
            href="/fish-sampling"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Fish Sampling
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/fish-sampling"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Fish Sampling
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fish Sampling Details</h1>
            <p className="text-gray-600">Detailed view of fish sampling record</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/fish-sampling/${samplingId}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleteSampling.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Scale className="h-5 w-5 mr-2 text-blue-600" />
            Sampling Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Pond</h3>
              <p className="text-lg font-semibold text-gray-900">{sampling.data.pond_name}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Sampling Date</h3>
              <p className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {formatDate(sampling.data.date)}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Recorded By</h3>
              <p className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="h-4 w-4 mr-2" />
                {sampling.data.user_username}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Sample Size</h3>
              <p className="text-lg font-semibold text-gray-900">{sampling.data.sample_size} fish</p>
            </div>
          </div>
        </div>

        {/* Weight Measurements */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Weight Measurements</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-700 mb-2">Total Weight</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {parseFloat(sampling.data.total_weight_kg).toFixed(3)} kg
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-700 mb-2">Average Weight</h3>
                <p className="text-2xl font-bold text-green-900">
                  {parseFloat(sampling.data.average_weight_kg).toFixed(1)} kg
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-700 mb-2">Fish per kg</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {parseFloat(sampling.data.fish_per_kg).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Growth Metrics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Condition Factor</h3>
              <p className="text-lg font-semibold text-gray-900">
                {sampling.data.condition_factor ? parseFloat(sampling.data.condition_factor).toFixed(3) : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Indicates fish health and nutritional status
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Growth Rate</h3>
              <p className="text-lg font-semibold text-gray-900">
                {sampling.data.growth_rate_kg_per_day ? `${parseFloat(sampling.data.growth_rate_kg_per_day).toFixed(3)} kg/day` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Daily growth rate in kg (requires previous sampling data)
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Biomass Difference</h3>
              <p className="text-lg font-semibold text-gray-900">
                {sampling.data.biomass_difference_kg ? `${parseFloat(sampling.data.biomass_difference_kg).toFixed(1)} kg` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Total biomass change in pond since last sampling
              </p>
            </div>
          </div>
        </div>

        {/* Biomass Analysis */}
        {sampling.data.biomass_difference_kg && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Biomass Analysis</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Current Biomass</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {parseFloat(sampling.data.biomass_difference_kg || '0') > 0 ? '+' : ''}{parseFloat(sampling.data.biomass_difference_kg || '0').toFixed(1)} kg
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Change from previous sampling
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Growth Trend</h3>
                <div className="flex items-center">
                  {parseFloat(sampling.data.biomass_difference_kg || '0') > 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ↗️ Positive Growth
                    </span>
                  ) : parseFloat(sampling.data.biomass_difference_kg || '0') < 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      ↘️ Negative Growth
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      ➡️ No Change
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Biomass change indicator
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {sampling.data.notes && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes & Observations</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{sampling.data.notes}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span> {formatDate(sampling.data.created_at)}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {formatDate(sampling.data.updated_at)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
