'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSamplingById } from '@/hooks/useApi';
import { ArrowLeft, Edit, Droplets, Thermometer, TestTube, Fish, Activity } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import Link from 'next/link';

export default function WaterQualityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const samplingId = parseInt(params.id as string, 10);
  console.log(samplingId);
  const { data: sampling, isLoading } = useSamplingById(samplingId);
  console.log(sampling);
  const getSampleTypeIcon = (sampleType: string) => {
    switch (sampleType) {
      case 'water':
        return <Droplets className="h-6 w-6 text-blue-600" />;
      case 'fish':
        return <Fish className="h-6 w-6 text-green-600" />;
      case 'sediment':
        return <TestTube className="h-6 w-6 text-orange-600" />;
      default:
        return <TestTube className="h-6 w-6 text-gray-600" />;
    }
  };

  const getSampleTypeColor = (sampleType: string) => {
    switch (sampleType) {
      case 'water':
        return 'bg-blue-100 text-blue-800';
      case 'fish':
        return 'bg-green-100 text-green-800';
      case 'sediment':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Water Quality Sample Not Found</h2>
        <p className="text-gray-600 mb-6">The water quality sample you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/water-quality')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Water Quality
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
            <h1 className="text-3xl font-bold text-gray-900">Water Quality Sample Details</h1>
            <p className="text-gray-600 mt-1">
              {sampling.data.pond_name} - {formatDate(sampling.data.date)}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href={`/water-quality/${samplingId}/edit`}
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
              <TestTube className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Sample Type</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSampleTypeColor(sampling.data.sample_type_name)}`}>
                {getSampleTypeIcon(sampling.data.sample_type_name)}
                <span className="ml-1 capitalize">{sampling.data.sample_type_name}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Thermometer className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Temperature</p>
              <p className="text-2xl font-semibold text-gray-900">
                {sampling.data.temperature_c ? `${sampling.data.temperature_c}°C` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">pH Level</p>
              <p className="text-2xl font-semibold text-gray-900">{sampling.data.ph || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Droplets className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Dissolved Oxygen</p>
              <p className="text-2xl font-semibold text-gray-900">
                {sampling.data.dissolved_oxygen ? `${sampling.data.dissolved_oxygen} mg/L` : 'N/A'}
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
              <span className="text-sm font-medium">{sampling.data.pond_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="text-sm font-medium">{formatDate(sampling.data.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Sample Type:</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSampleTypeColor(sampling.data.sample_type_name)}`}>
                {getSampleTypeIcon(sampling.data.sample_type_name)}
                <span className="ml-1 capitalize">{sampling.data.sample_type_name}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created:</span>
              <span className="text-sm font-medium">{formatDate(sampling.data.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Water Quality Parameters</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">pH Level:</span>
              <span className="text-sm font-medium">{sampling.data.ph || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Temperature:</span>
              <span className="text-sm font-medium">
                {sampling.data.temperature_c ? `${sampling.data.temperature_c}°C` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Dissolved Oxygen:</span>
              <span className="text-sm font-medium">
                {sampling.data.dissolved_oxygen ? `${sampling.data.dissolved_oxygen} mg/L` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Ammonia:</span>
              <span className="text-sm font-medium">
                {sampling.data.ammonia ? `${sampling.data.ammonia} mg/L` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Nitrite:</span>
              <span className="text-sm font-medium">
                {sampling.data.nitrite ? `${sampling.data.nitrite} mg/L` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Nitrate:</span>
              <span className="text-sm font-medium">
                {sampling.data.nitrate ? `${sampling.data.nitrate} mg/L` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Water Parameters</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Alkalinity:</span>
              <span className="text-sm font-medium">
                {sampling.data.alkalinity ? `${sampling.data.alkalinity} mg/L` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Hardness:</span>
              <span className="text-sm font-medium">
                {sampling.data.hardness ? `${sampling.data.hardness} mg/L` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Turbidity:</span>
              <span className="text-sm font-medium">
                {sampling.data.turbidity ? `${sampling.data.turbidity} NTU` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Fish Parameters (only for fish samples) */}
        {sampling.data.sample_type_name === 'fish' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Fish className="h-5 w-5 mr-2 text-green-600" />
              Fish Parameters
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Fish Weight:</span>
                <span className="text-sm font-medium">
                  {sampling.data.fish_weight_g ? `${(parseFloat(sampling.data.fish_weight_g) / 1000).toFixed(3)} kg` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Fish Length:</span>
                <span className="text-sm font-medium">
                  {sampling.data.fish_length_cm ? `${(parseFloat(sampling.data.fish_length_cm) / 30.48).toFixed(2)} ft` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes Section */}
      {sampling.data.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{sampling.data.notes}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            href={`/water-quality/${samplingId}/edit`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Edit Sample</span>
          </Link>
          
          <Link
            href={`/ponds/${sampling.data.pond}`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Droplets className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-sm font-medium">View Pond</span>
          </Link>
          
          <Link
            href="/water-quality"
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <TestTube className="h-6 w-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium">All Samples</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
