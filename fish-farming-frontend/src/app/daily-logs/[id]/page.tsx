'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDailyLogById } from '@/hooks/useApi';
import { ArrowLeft, Edit, Calendar, Thermometer, Droplets, AlertTriangle, Cloud } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import Link from 'next/link';

export default function DailyLogDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const dailyLogId = parseInt(params.id as string);
  
  const { data: dailyLog, isLoading } = useDailyLogById(dailyLogId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dailyLog) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Daily Log Not Found</h2>
        <p className="text-gray-600 mb-6">The daily log you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/daily-logs')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Daily Logs
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
            <h1 className="text-3xl font-bold text-gray-900">Daily Log Details</h1>
            <p className="text-gray-600 mt-1">
              {dailyLog.data.pond_name} - {formatDate(dailyLog.data.date)}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href={`/daily-logs/${dailyLogId}/edit`}
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
              <p className="text-sm font-medium text-gray-500">Date</p>
              <p className="text-2xl font-semibold text-gray-900">{formatDate(dailyLog.data.date)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Cloud className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Weather</p>
              <p className="text-2xl font-semibold text-gray-900">{dailyLog.data.weather || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Thermometer className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Water Temp</p>
              <p className="text-2xl font-semibold text-gray-900">
                {dailyLog.data.water_temp_c ? `${dailyLog.data.water_temp_c}°C` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Droplets className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">pH Level</p>
              <p className="text-2xl font-semibold text-gray-900">{dailyLog.data.ph || 'N/A'}</p>
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
              <span className="text-sm font-medium">{dailyLog.data.pond_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="text-sm font-medium">{formatDate(dailyLog.data.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Weather:</span>
              <span className="text-sm font-medium">{dailyLog.data.weather || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created:</span>
              <span className="text-sm font-medium">{formatDate(dailyLog.data.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Water Quality Parameters</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Water Temperature:</span>
              <span className="text-sm font-medium">
                {dailyLog.data.water_temp_c ? `${dailyLog.data.water_temp_c}°C` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">pH Level:</span>
              <span className="text-sm font-medium">{dailyLog.data.ph || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Dissolved Oxygen:</span>
              <span className="text-sm font-medium">
                {dailyLog.data.dissolved_oxygen ? `${dailyLog.data.dissolved_oxygen} mg/L` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Ammonia:</span>
              <span className="text-sm font-medium">
                {dailyLog.data.ammonia ? `${dailyLog.data.ammonia} mg/L` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Nitrite:</span>
              <span className="text-sm font-medium">
                {dailyLog.data.nitrite ? `${dailyLog.data.nitrite} mg/L` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {dailyLog.data.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{dailyLog.data.notes}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            href={`/daily-logs/${dailyLogId}/edit`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Edit Log</span>
          </Link>
          
          <Link
            href={`/ponds/${dailyLog.data.pond}`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Droplets className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-sm font-medium">View Pond</span>
          </Link>
          
          <Link
            href="/daily-logs"
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Calendar className="h-6 w-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium">All Logs</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
