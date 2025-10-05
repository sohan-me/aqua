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

  // Calculate averages for water quality parameters
  const calculateAverages = (data: any) => {
    const params = ['water_temp_c', 'ph', 'dissolved_oxygen', 'ammonia', 'nitrite'];
    const directions = ['east', 'west', 'north', 'south'];
    
    const averages: any = {};
    
    params.forEach(param => {
      const values = directions
        .map(dir => data[`${dir}_${param}`])
        .filter(val => val !== null && val !== undefined && val !== '');
      
      if (values.length > 0) {
        const sum = values.reduce((acc, val) => acc + parseFloat(val), 0);
        averages[param] = (sum / values.length).toFixed(2);
      } else {
        averages[param] = null;
      }
    });
    
    return averages;
  };

  const averages = dailyLog ? calculateAverages(dailyLog.data) : {};

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
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm border border-blue-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Date</p>
              <p className="text-2xl font-semibold text-blue-900">{formatDate(dailyLog.data.date)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Cloud className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Weather</p>
              <p className="text-2xl font-semibold text-gray-900">{dailyLog.data.weather || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Thermometer className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-600">Avg Temperature</p>
              <p className="text-2xl font-semibold text-red-900">
                {averages.water_temp_c ? `${averages.water_temp_c}°C` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Droplets className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Avg pH Level</p>
              <p className="text-2xl font-semibold text-green-900">{averages.ph || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Average Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm border border-purple-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Droplets className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Avg Dissolved Oxygen</p>
              <p className="text-2xl font-semibold text-purple-900">
                {averages.dissolved_oxygen ? `${averages.dissolved_oxygen} mg/L` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-sm border border-yellow-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-600">Avg Ammonia</p>
              <p className="text-2xl font-semibold text-yellow-900">
                {averages.ammonia ? `${averages.ammonia} mg/L` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow-sm border border-indigo-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-indigo-600">Avg Nitrite</p>
              <p className="text-2xl font-semibold text-indigo-900">
                {averages.nitrite ? `${averages.nitrite} mg/L` : 'N/A'}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">General Water Quality Parameters</h3>
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

      {/* Directional Water Quality */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Directional Water Quality Measurements</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* East Side */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
              East Side Water Quality
            </h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Temperature</span>
                  <span className="text-lg font-bold text-red-600">
                    {dailyLog.data.east_water_temp_c ? `${dailyLog.data.east_water_temp_c}°C` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">pH Level</span>
                  <span className="text-lg font-bold text-red-600">{dailyLog.data.east_ph || 'N/A'}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Dissolved Oxygen</span>
                  <span className="text-lg font-bold text-red-600">
                    {dailyLog.data.east_dissolved_oxygen ? `${dailyLog.data.east_dissolved_oxygen} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Ammonia</span>
                  <span className="text-lg font-bold text-red-600">
                    {dailyLog.data.east_ammonia ? `${dailyLog.data.east_ammonia} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Nitrite</span>
                  <span className="text-lg font-bold text-red-600">
                    {dailyLog.data.east_nitrite ? `${dailyLog.data.east_nitrite} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* West Side */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-6">
            <h3 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
              West Side Water Quality
            </h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Temperature</span>
                  <span className="text-lg font-bold text-orange-600">
                    {dailyLog.data.west_water_temp_c ? `${dailyLog.data.west_water_temp_c}°C` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">pH Level</span>
                  <span className="text-lg font-bold text-orange-600">{dailyLog.data.west_ph || 'N/A'}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Dissolved Oxygen</span>
                  <span className="text-lg font-bold text-orange-600">
                    {dailyLog.data.west_dissolved_oxygen ? `${dailyLog.data.west_dissolved_oxygen} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Ammonia</span>
                  <span className="text-lg font-bold text-orange-600">
                    {dailyLog.data.west_ammonia ? `${dailyLog.data.west_ammonia} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Nitrite</span>
                  <span className="text-lg font-bold text-orange-600">
                    {dailyLog.data.west_nitrite ? `${dailyLog.data.west_nitrite} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* North Side */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              North Side Water Quality
            </h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Temperature</span>
                  <span className="text-lg font-bold text-green-600">
                    {dailyLog.data.north_water_temp_c ? `${dailyLog.data.north_water_temp_c}°C` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">pH Level</span>
                  <span className="text-lg font-bold text-green-600">{dailyLog.data.north_ph || 'N/A'}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Dissolved Oxygen</span>
                  <span className="text-lg font-bold text-green-600">
                    {dailyLog.data.north_dissolved_oxygen ? `${dailyLog.data.north_dissolved_oxygen} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Ammonia</span>
                  <span className="text-lg font-bold text-green-600">
                    {dailyLog.data.north_ammonia ? `${dailyLog.data.north_ammonia} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Nitrite</span>
                  <span className="text-lg font-bold text-green-600">
                    {dailyLog.data.north_nitrite ? `${dailyLog.data.north_nitrite} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* South Side */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm border border-purple-200 p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
              South Side Water Quality
            </h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Temperature</span>
                  <span className="text-lg font-bold text-purple-600">
                    {dailyLog.data.south_water_temp_c ? `${dailyLog.data.south_water_temp_c}°C` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">pH Level</span>
                  <span className="text-lg font-bold text-purple-600">{dailyLog.data.south_ph || 'N/A'}</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Dissolved Oxygen</span>
                  <span className="text-lg font-bold text-purple-600">
                    {dailyLog.data.south_dissolved_oxygen ? `${dailyLog.data.south_dissolved_oxygen} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Ammonia</span>
                  <span className="text-lg font-bold text-purple-600">
                    {dailyLog.data.south_ammonia ? `${dailyLog.data.south_ammonia} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Nitrite</span>
                  <span className="text-lg font-bold text-purple-600">
                    {dailyLog.data.south_nitrite ? `${dailyLog.data.south_nitrite} mg/L` : 'N/A'}
                  </span>
                </div>
              </div>
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
