'use client';

import { useDailyLogs, usePonds, useDeleteDailyLog } from '@/hooks/useApi';
import { DailyLog, Pond } from '@/lib/api';
import { formatDate, extractApiData } from '@/lib/utils';
import { Plus, Edit, Trash2, Eye, Calendar, Cloud, Thermometer } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function DailyLogsPage() {
  const { data: dailyLogsData, isLoading } = useDailyLogs();
  const { data: pondsData } = usePonds();
  const deleteDailyLog = useDeleteDailyLog();
  
  const dailyLogs = extractApiData<DailyLog>(dailyLogsData?.data);

  const handleDelete = async (id: number, pondName: string, date: string) => {
    if (window.confirm(`Are you sure you want to delete the daily log for ${pondName} on ${formatDate(date)}? This action cannot be undone.`)) {
      try {
        await deleteDailyLog.mutateAsync(id);
      } catch (error) {
        toast.error('Failed to delete daily log');
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

  return (
    <div className="space-y-6">
      <div className="md:flex space-y-3 md:space-y-0 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Logs</h1>
          <p className="text-gray-600">Track daily pond conditions and activities</p>
        </div>
        <Link
          style={{color: "white"}}
          href="/daily-logs/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Daily Log
        </Link>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Total Daily Logs</h3>
            <p className="text-3xl font-bold text-blue-600">{dailyLogs.length}</p>
          </div>
          <div className="rounded-full bg-blue-100 p-3">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Daily Logs List */}
      {dailyLogs.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No daily logs</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by recording your first daily log.</p>
          <div className="mt-6">
            <Link
              href="/daily-logs/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Daily Log
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {dailyLogs.map((log) => {
            // Calculate average temperature
            const temps = [
              log.east_water_temp_c,
              log.west_water_temp_c,
              log.north_water_temp_c,
              log.south_water_temp_c
            ].filter(temp => temp !== null && temp !== undefined);
            
            const avgTemp = temps.length > 0 
              ? (temps.reduce((sum, temp) => sum + parseFloat(temp), 0) / temps.length).toFixed(1)
              : null;

            return (
              <div key={log.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{log.pond_name}</h3>
                        <p className="text-sm text-gray-500">{formatDate(log.date)}</p>
                      </div>
                      {log.weather && (
                        <div className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Cloud className="h-3 w-3 mr-1" />
                          {log.weather}
                        </div>
                      )}
                    </div>

                    {/* Water Quality Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-red-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-red-700 uppercase tracking-wide">East</p>
                            <p className="text-lg font-semibold text-red-900">
                              {log.east_water_temp_c ? `${log.east_water_temp_c}°C` : 'N/A'}
                            </p>
                          </div>
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">West</p>
                            <p className="text-lg font-semibold text-orange-900">
                              {log.west_water_temp_c ? `${log.west_water_temp_c}°C` : 'N/A'}
                            </p>
                          </div>
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-green-700 uppercase tracking-wide">North</p>
                            <p className="text-lg font-semibold text-green-900">
                              {log.north_water_temp_c ? `${log.north_water_temp_c}°C` : 'N/A'}
                            </p>
                          </div>
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        </div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">South</p>
                            <p className="text-lg font-semibold text-purple-900">
                              {log.south_water_temp_c ? `${log.south_water_temp_c}°C` : 'N/A'}
                            </p>
                          </div>
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        </div>
                      </div>
                    </div>

                    {avgTemp && (
                      <div className="flex items-center text-sm text-gray-600 mb-4">
                        <Thermometer className="h-4 w-4 mr-1" />
                        <span>Average Temperature: <span className="font-semibold">{avgTemp}°C</span></span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                        <Link
                          href={`/daily-logs/${log.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          title="View Details"
                        >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                        </Link>
                        <Link
                          href={`/daily-logs/${log.id}/edit`}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          title="Edit"
                        >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(log.id, log.pond_name, log.date)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title="Delete"
                          disabled={deleteDailyLog.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                </div>
          </div>
            );
          })}
        </div>
      )}
    </div>
  );
}