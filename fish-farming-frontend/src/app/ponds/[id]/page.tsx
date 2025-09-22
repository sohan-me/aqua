'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePond, usePondSummary, usePondFinancialSummary, useFcrAnalysis } from '@/hooks/useApi';
import { ArrowLeft, Edit, Trash2, Plus, TrendingUp, TrendingDown, AlertTriangle, Fish, Droplets, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function PondDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const pondId = parseInt(params.id as string);
  console.log(pondId);
  const { data: pond, isLoading: pondLoading } = usePond(pondId);
  const { data: summary, isLoading: summaryLoading } = usePondSummary(pondId);
  const { data: financial, isLoading: financialLoading } = usePondFinancialSummary(pondId);
  const { data: fcrAnalysis, isLoading: fcrLoading } = useFcrAnalysis({ pond: pondId });
console.log(pond);
  if (pondLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pond) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Pond Not Found</h2>
        <p className="text-gray-600 mb-6">The pond you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/ponds')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ponds
        </button>
      </div>
    );
  }

  const handleEdit = () => {
    router.push(`/ponds/${pondId}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this pond? This action cannot be undone.')) {
      // TODO: Implement delete functionality
      toast.error('Delete functionality not implemented yet');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
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
            <h1 className="text-3xl font-bold text-gray-900">{pond.data.name}</h1>
            <p className="text-gray-600 mt-1">{pond.data.location || 'No location specified'}</p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleEdit}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          pond.data.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {pond.data.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Droplets className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Area</p>
              <p className="text-2xl font-semibold text-gray-900">{pond.data.water_area_decimal || 'N/A'} decimal</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Droplets className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Depth</p>
              <p className="text-2xl font-semibold text-gray-900">{pond.data.depth_ft || 'N/A'} ft</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Droplets className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Volume</p>
              <p className="text-2xl font-semibold text-gray-900">{pond.data.volume_m3 || 'N/A'} m³</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Created</p>
              <p className="text-sm font-semibold text-gray-900">
                {pond.data.created_at ? new Date(pond.data.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      {financialLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      ) : financial ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingDown className="h-6 w-6 text-red-600 mr-2" />
                <span className="text-sm font-medium text-gray-500">Total Expenses</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(financial.data.total_expenses || 0)}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-500">Total Income</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(financial.data.total_income || 0)}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <span className="text-sm font-medium text-gray-500">Profit/Loss</span>
              </div>
              <p className={`text-2xl font-bold ${
                (financial.data.profit_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(financial.data.profit_loss || 0)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
          <div className="text-center text-gray-500 py-8">
            <p>No financial data available for this pond.</p>
          </div>
        </div>
      )}

      {/* FCR Analysis */}
      {fcrLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feed Conversion Ratio (FCR) Analysis</h2>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      ) : fcrAnalysis ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feed Conversion Ratio (FCR) Analysis</h2>
          
          {/* Overall FCR Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Fish className="h-6 w-6 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-500">Overall FCR</span>
              </div>
              <p className={`text-3xl font-bold ${
                fcrAnalysis.data.summary.fcr_status === 'Excellent' ? 'text-green-600' :
                fcrAnalysis.data.summary.fcr_status === 'Good' ? 'text-blue-600' :
                fcrAnalysis.data.summary.fcr_status === 'Needs Improvement' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {fcrAnalysis.data.summary.overall_fcr.toFixed(4)}
              </p>
              <p className={`text-sm font-medium ${
                fcrAnalysis.data.summary.fcr_status === 'Excellent' ? 'text-green-600' :
                fcrAnalysis.data.summary.fcr_status === 'Good' ? 'text-blue-600' :
                fcrAnalysis.data.summary.fcr_status === 'Needs Improvement' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {fcrAnalysis.data.summary.fcr_status}
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-500">Total Feed Used</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fcrAnalysis.data.summary.total_feed_kg.toFixed(1)} kg</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-500">Weight Gain</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fcrAnalysis.data.summary.total_weight_gain_kg.toFixed(1)} kg</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="h-6 w-6 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-500">Analysis Period</span>
              </div>
              <p className="text-sm font-bold text-gray-900">
                {new Date(fcrAnalysis.data.summary.date_range.start_date).toLocaleDateString()} - {new Date(fcrAnalysis.data.summary.date_range.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Detailed FCR Data */}
          {fcrAnalysis.data.fcr_data && fcrAnalysis.data.fcr_data.length > 0 && (
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3">Detailed Analysis by Species</h3>
              <div className="space-y-3">
                {fcrAnalysis.data.fcr_data.map((fcr, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Fish className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="font-medium text-gray-900">{fcr.species_name}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        fcr.fcr_status === 'Excellent' ? 'bg-green-100 text-green-800' :
                        fcr.fcr_status === 'Good' ? 'bg-blue-100 text-blue-800' :
                        fcr.fcr_status === 'Needs Improvement' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {fcr.fcr_status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">FCR:</span>
                        <span className="ml-1 font-medium">{fcr.fcr.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fish Count:</span>
                        <span className="ml-1 font-medium">{fcr.estimated_fish_count.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Feed Used:</span>
                        <span className="ml-1 font-medium">{fcr.total_feed_kg.toFixed(1)} kg</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Weight Gain:</span>
                        <span className="ml-1 font-medium">{fcr.total_weight_gain_kg.toFixed(1)} kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feed Conversion Ratio (FCR) Analysis</h2>
          <div className="text-center text-gray-500 py-8">
            <Fish className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p>No FCR data available for this pond.</p>
            <p className="text-sm mt-2">Add fish sampling and feeding records to see FCR analysis.</p>
          </div>
        </div>
      )}

      {/* Summary Information */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pond Summary</h3>
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pond Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Expenses:</span>
                    <span className="text-sm font-medium">{formatCurrency(summary.data.total_expenses || 0)}</span>
                </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Income:</span>
                <span className="text-sm font-medium">{formatCurrency(summary.data.total_income || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Active Alerts:</span>
                <span className="text-sm font-medium">{summary.data.active_alerts_count || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {summary.data.latest_stocking ? (
                <div className="flex items-center text-sm">
                  <Fish className="h-4 w-4 text-blue-600 mr-2" />
                  <span>Latest stocking: {summary.data.latest_stocking.species_name || 'Unknown'}</span>
                </div>
              ) : (
                <div className="flex items-center text-sm text-gray-500">
                  <Fish className="h-4 w-4 text-gray-400 mr-2" />
                  <span>No stocking records</span>
                </div>
              )}
              {summary.data.latest_daily_log ? (
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 text-gray-600 mr-2" />
                  <span>Latest log: {new Date(summary.data.latest_daily_log.date).toLocaleDateString()}</span>
                </div>
              ) : (
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span>No daily logs</span>
                </div>
              )}
              {summary.data.latest_harvest ? (
                <div className="flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                  <span>Latest harvest: {formatCurrency(summary.data.latest_harvest.total_revenue || 0)}</span>
                </div>
              ) : (
                <div className="flex items-center text-sm text-gray-500">
                  <TrendingUp className="h-4 w-4 text-gray-400 mr-2" />
                  <span>No harvest records</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pond Summary</h3>
            <div className="text-center text-gray-500 py-8">
              <p>No summary data available.</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="text-center text-gray-500 py-8">
              <p>No activity data available.</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button
            onClick={() => router.push(`/stocking?pond=${pondId}`)}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Fish className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Add Stocking</span>
          </button>
          
          <button
            onClick={() => router.push(`/daily-logs?pond=${pondId}`)}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Calendar className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-sm font-medium">Daily Log</span>
          </button>
          
          <button
            onClick={() => router.push(`/expenses?pond=${pondId}`)}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <TrendingDown className="h-6 w-6 text-red-600 mb-2" />
            <span className="text-sm font-medium">Add Expense</span>
          </button>
          
          <button
            onClick={() => router.push(`/income?pond=${pondId}`)}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <TrendingUp className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-sm font-medium">Add Income</span>
          </button>
          
          <button
            onClick={() => router.push(`/fish-sampling?pond=${pondId}`)}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <AlertTriangle className="h-6 w-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium">Fish Sampling</span>
          </button>
        </div>
      </div>
    </div>
  );
}
