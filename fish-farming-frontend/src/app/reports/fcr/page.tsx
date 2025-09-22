'use client';

import { useState } from 'react';
import { useFcrAnalysis } from '@/hooks/useApi';
import { usePonds } from '@/hooks/useApi';
import { useSpecies } from '@/hooks/useApi';
import { Pond, Species } from '@/lib/api';
import { formatDate, extractApiData } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar, 
  Filter,
  Download,
  BarChart3,
  Fish,
  Scale
} from 'lucide-react';

export default function FcrReportPage() {
  const [filters, setFilters] = useState({
    pond: '',
    species: '',
    start_date: '',
    end_date: ''
  });

  // Only send non-empty filter values to avoid issues with empty strings
  const fcrFilters = Object.fromEntries(
    Object.entries(filters).filter(([_, value]) => value !== '')
  );
  
  const { data: fcrData, isLoading, error } = useFcrAnalysis(fcrFilters);
  const { data: pondsData } = usePonds();
  const { data: speciesData } = useSpecies();
  
  const ponds = extractApiData<Pond>(pondsData?.data);
  const species = extractApiData<Species>(speciesData?.data);

  // Safe data access helpers - FCR analysis data is wrapped in 'data' property by useApiQuery
  const fcrSummary = fcrData?.data?.summary || {
    total_feed_kg: 0,
    total_weight_gain_kg: 0,
    overall_fcr: 0,
    fcr_status: 'Unknown' as const,
    total_combinations: 0,
    date_range: {
      start_date: '',
      end_date: ''
    }
  };
  const fcrDataArray = fcrData?.data?.fcr_data || [];


  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getFcrStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'text-green-600 bg-green-100';
      case 'Good': return 'text-blue-600 bg-blue-100';
      case 'Needs Improvement': return 'text-yellow-600 bg-yellow-100';
      case 'Poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getFcrStatusIcon = (fcr: number) => {
    if (fcr <= 1.2) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (fcr <= 1.5) return <Target className="h-4 w-4 text-blue-600" />;
    if (fcr <= 2.0) return <TrendingDown className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-red-800">Error loading FCR data</h3>
        <p className="text-red-600 mt-2">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
            FCR Analysis Report
          </h1>
          <p className="text-gray-600 mt-1">
            Feed Conversion Ratio analysis by pond and species
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pond</label>
            <select
              value={filters.pond}
              onChange={(e) => handleFilterChange('pond', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Ponds</option>
              {ponds?.map((pond) => (
                <option key={pond.id} value={pond.id}>
                  {pond.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Species</label>
            <select
              value={filters.species}
              onChange={(e) => handleFilterChange('species', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Species</option>
              {species?.map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {fcrData && fcrSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Scale className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overall FCR</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {fcrSummary.overall_fcr?.toFixed(4) || '0.0000'}
                </p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFcrStatusColor(fcrSummary.fcr_status || 'Unknown')}`}>
                  {fcrSummary.fcr_status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Fish className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Feed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {((fcrSummary.total_feed_kg || 0) / 1000).toFixed(1)} t
                </p>
                <p className="text-sm text-gray-500">
                  {(fcrSummary.total_feed_kg || 0).toFixed(4)} kg
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Weight Gain</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {((fcrSummary.total_weight_gain_kg || 0) / 1000).toFixed(1)} t
                </p>
                <p className="text-sm text-gray-500">
                  {(fcrSummary.total_weight_gain_kg || 0).toFixed(4)} kg
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Combinations</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {fcrSummary.total_combinations || 0}
                </p>
                <p className="text-sm text-gray-500">
                  Pond-Species pairs
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FCR Data Table */}
      {fcrData && fcrDataArray.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">FCR Analysis by Pond & Species</h3>
            <p className="text-sm text-gray-500 mt-1">
              Date range: {formatDate(fcrSummary.date_range?.start_date || '')} - {formatDate(fcrSummary.date_range?.end_date || '')}
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pond & Species
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fish Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight Range
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feed (kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight Gain (kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FCR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fcrDataArray.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.pond_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.species_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.days} days
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(item.start_date)} - {formatDate(item.end_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.estimated_fish_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(item.initial_weight_kg * 1000).toFixed(4)}g - {(item.final_weight_kg * 1000).toFixed(4)}g
                      </div>
                      <div className="text-sm text-gray-500">
                        +{(item.weight_gain_per_fish_kg * 1000).toFixed(0)}g/fish
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.total_feed_kg.toFixed(4)} kg
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.avg_daily_feed_kg.toFixed(4)} kg/day
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.total_weight_gain_kg.toFixed(4)} kg
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.avg_daily_weight_gain_kg.toFixed(4)} kg/day
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getFcrStatusIcon(item.fcr)}
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {item.fcr.toFixed(4)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFcrStatusColor(item.fcr_status)}`}>
                        {item.fcr_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {fcrData && fcrDataArray.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No FCR data available</h3>
          <p className="mt-1 text-sm text-gray-500">
            No feeding and sampling data found for the selected filters.
          </p>
        </div>
      )}
    </div>
  );
}
