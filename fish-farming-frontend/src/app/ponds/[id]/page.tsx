'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePond, usePondSummary, usePondFinancialSummary, useFcrAnalysis, useDeletePond, useCustomerStocks } from '@/hooks/useApi';
import { CustomerStock } from '@/lib/api';
import { ArrowLeft, Edit, Trash2, Plus, TrendingUp, TrendingDown, AlertTriangle, Fish, Droplets, Calendar, Package } from 'lucide-react';
import { formatCurrency, extractApiData } from '@/lib/utils';
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
  const deletePond = useDeletePond();
  
  // Fetch customer stock for this pond
  const { data: customerStocksData, isLoading: stocksLoading } = useCustomerStocks({ pond: pondId } as any);
  const customerStocks = extractApiData<CustomerStock>(customerStocksData?.data);
  
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
      try {
        await deletePond.mutateAsync(pondId);
        toast.success('Pond deleted successfully');
        router.push('/ponds');
      } catch (error) {
        toast.error('Failed to delete pond');
        console.error('Error deleting pond:', error);
      }
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
              disabled={deletePond.isPending}
              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletePond.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          pond.data.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {pond.data.is_active ? 'Active' : 'Inactive'}
        </span>
        
        {/* Leasing Status Badge */}
        {pond.data.leasing_end_date && (() => {
          const endDate = new Date(pond.data.leasing_end_date);
          const today = new Date();
          const timeDiff = endDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          if (daysRemaining > 30) {
            return (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <Calendar className="h-3 w-3 mr-1" />
                Lease Active ({daysRemaining} days)
              </span>
            );
          } else if (daysRemaining > 0) {
            return (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Lease Expires Soon ({daysRemaining} days)
              </span>
            );
          } else if (daysRemaining === 0) {
            return (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Lease Expires Today
              </span>
            );
          } else {
            return (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Lease Expired ({Math.abs(daysRemaining)} days ago)
              </span>
            );
          }
        })()}
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

      {/* Leasing Information */}
      {(pond.data.leasing_date || pond.data.leasing_end_date || pond.data.rate_per_decimal || pond.data.total_leasing_money) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Leasing Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pond.data.leasing_date && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-500">Leasing Start Date</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(pond.data.leasing_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {pond.data.leasing_end_date && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Calendar className="h-6 w-6 text-red-600 mr-2" />
                  <span className="text-sm font-medium text-gray-500">Leasing End Date</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(pond.data.leasing_end_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {pond.data.rate_per_decimal && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-gray-500">Rate per Decimal</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(pond.data.rate_per_decimal)}
                </p>
              </div>
            )}

            {pond.data.total_leasing_money && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-500">Total Leasing Money</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(pond.data.total_leasing_money)}
                </p>
              </div>
            )}
          </div>

          {/* Remaining Period Status */}
          {pond.data.leasing_end_date && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Leasing Status</h3>
              {(() => {
                const endDate = new Date(pond.data.leasing_end_date);
                const today = new Date();
                const timeDiff = endDate.getTime() - today.getTime();
                const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
                
                if (daysRemaining > 0) {
                  return (
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        <strong>{daysRemaining} days</strong> remaining until lease expires
                      </span>
                    </div>
                  );
                } else if (daysRemaining === 0) {
                  return (
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        <strong>Lease expires today!</strong>
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-sm text-gray-700">
                        <strong>Lease expired {Math.abs(daysRemaining)} days ago</strong>
                      </span>
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </div>
      )}

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

        {/* Customer Stock Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2 text-blue-600" />
              Pond Inventory
            </h2>
            <button
              onClick={() => router.push(`/feeding-events?pond=${pondId}`)}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
            >
              View Feeding Events
            </button>
          </div>
          
          {stocksLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : customerStocks && customerStocks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customerStocks.map((stock) => {
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'out_of_stock':
                          return 'bg-red-100 text-red-800';
                        case 'low_stock':
                          return 'bg-yellow-100 text-yellow-800';
                        case 'overstocked':
                          return 'bg-purple-100 text-purple-800';
                        default:
                          return 'bg-green-100 text-green-800';
                      }
                    };

                    const getStatusText = (status: string) => {
                      switch (status) {
                        case 'out_of_stock':
                          return 'Out of Stock';
                        case 'low_stock':
                          return 'Low Stock';
                        case 'overstocked':
                          return 'Overstocked';
                        default:
                          return 'In Stock';
                      }
                    };

                    return (
                      <tr key={stock.customer_stock_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {stock.item_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {stock.item_type}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stock.current_stock} {stock.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stock.min_stock_level} {stock.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(stock.stock_status)}`}>
                            {getStatusText(stock.stock_status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stock.unit_cost ? formatCurrency(stock.unit_cost) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(stock.last_updated).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Inventory Items</h3>
              <p className="text-gray-500 mb-4">
                This pond doesn't have any inventory items yet. Create an invoice to this pond to add items to its inventory.
              </p>
              <button
                onClick={() => router.push(`/invoices`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create Invoice
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
