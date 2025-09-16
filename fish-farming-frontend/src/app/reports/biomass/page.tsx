'use client';

import { useState, useEffect } from 'react';
import { usePonds, useSpecies } from '@/hooks/useApi';
import { Pond, Species } from '@/lib/api';
import { extractApiData } from '@/lib/utils';
import { 
  BarChart3, 
  Calendar, 
  Filter, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Scale,
  Fish
} from 'lucide-react';
import { toast } from 'sonner';

interface BiomassFilters {
  pondId: string;
  speciesId: string;
  startDate: string;
  endDate: string;
}

interface BiomassData {
  summary: {
    total_biomass_gain_kg: number;
    total_biomass_loss_kg: number;
    net_biomass_change_kg: number;
    total_current_biomass_kg: number;
    total_samplings: number;
    samplings_with_biomass_data: number;
  };
  pond_summary: Record<string, {
    total_gain: number;
    total_loss: number;
    net_change: number;
    sampling_count: number;
  }>;
  species_summary: Record<string, {
    total_gain: number;
    total_loss: number;
    net_change: number;
    sampling_count: number;
  }>;
  biomass_changes: Array<{
    id: number;
    pond_name: string;
    species_name: string;
    date: string;
    biomass_difference_kg: number;
    growth_rate_kg_per_day: number | null;
    average_weight_kg: number;
    sample_size: number;
  }>;
  pond_species_biomass: Record<string, {
    initial_biomass: number;
    growth_biomass: number;
    current_biomass: number;
  }>;
  filters_applied: {
    pond_id: string | null;
    species_id: string | null;
    start_date: string | null;
    end_date: string | null;
  };
}

export default function BiomassReportPage() {
  const { data: pondsData } = usePonds();
  const { data: speciesData } = useSpecies();
  
  const ponds = extractApiData<Pond>(pondsData);
  const species = extractApiData<Species>(speciesData);
  
  const [filters, setFilters] = useState<BiomassFilters>({
    pondId: 'all',
    speciesId: 'all',
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  const [biomassData, setBiomassData] = useState<BiomassData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBiomassData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.pondId !== 'all') params.append('pond', filters.pondId);
      if (filters.speciesId !== 'all') params.append('species', filters.speciesId);
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);

      const response = await fetch(`http://127.0.0.1:8000/api/fish-farming/fish-sampling/biomass_analysis/?${params}`, {
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBiomassData(data);
      } else {
        toast.error('Failed to fetch biomass data');
      }
    } catch (error) {
      toast.error('Error fetching biomass data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBiomassData();
  }, [filters]);

  const handleFilterChange = (key: keyof BiomassFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportBiomassData = () => {
    if (!biomassData) return;
    
    const csvData = biomassData.biomass_changes.map(change => ({
      'Date': change.date,
      'Pond': change.pond_name,
      'Species': change.species_name,
      'Biomass Change (kg)': change.biomass_difference_kg.toFixed(3),
      'Growth Rate (kg/day)': change.growth_rate_kg_per_day?.toFixed(3) || 'N/A',
      'Average Weight (kg)': change.average_weight_kg.toFixed(3),
      'Sample Size': change.sample_size,
    }));

    const headers = ['Date', 'Pond', 'Species', 'Biomass Change (kg)', 'Growth Rate (kg/day)', 'Average Weight (kg)', 'Sample Size'];
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biomass-report-${filters.startDate}-to-${filters.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Biomass report exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
            Biomass Analysis Report
          </h1>
          <p className="text-gray-600">Comprehensive biomass growth analysis and trends</p>
        </div>
        <button
          onClick={exportBiomassData}
          disabled={!biomassData}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="h-5 w-5 mr-2 text-blue-600" />
          Filters
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pond</label>
            <select
              value={filters.pondId}
              onChange={(e) => handleFilterChange('pondId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Ponds</option>
              {ponds.map((pond) => (
                <option key={pond.id} value={pond.id.toString()}>
                  {pond.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Species</label>
            <select
              value={filters.speciesId}
              onChange={(e) => handleFilterChange('speciesId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Species</option>
              {species.map((spec) => (
                <option key={spec.id} value={spec.id.toString()}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : biomassData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Scale className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Current Biomass</h3>
                  <p className="text-2xl font-bold text-indigo-600">
                    {biomassData.summary.total_current_biomass_kg.toFixed(1)} kg
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Biomass Gain</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {biomassData.summary.total_biomass_gain_kg.toFixed(1)} kg
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingDown className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Biomass Loss</h3>
                  <p className="text-2xl font-bold text-red-600">
                    {biomassData.summary.total_biomass_loss_kg.toFixed(1)} kg
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Net Biomass Change</h3>
                  <p className={`text-2xl font-bold ${biomassData.summary.net_biomass_change_kg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {biomassData.summary.net_biomass_change_kg >= 0 ? '+' : ''}{biomassData.summary.net_biomass_change_kg.toFixed(1)} kg
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Fish className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Samplings</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {biomassData.summary.total_samplings}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pond Summary */}
          {Object.keys(biomassData.pond_summary).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pond Summary</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pond</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gain (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Loss (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Change (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Samplings</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(biomassData.pond_summary).map(([pondName, data]) => (
                      <tr key={pondName}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pondName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{data.total_gain.toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{data.total_loss.toFixed(1)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${data.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {data.net_change >= 0 ? '+' : ''}{data.net_change.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{data.sampling_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Species Summary */}
          {Object.keys(biomassData.species_summary).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Species Summary</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Species</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gain (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Loss (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Change (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Samplings</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(biomassData.species_summary).map(([speciesName, data]) => (
                      <tr key={speciesName}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{speciesName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{data.total_gain.toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{data.total_loss.toFixed(1)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${data.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {data.net_change >= 0 ? '+' : ''}{data.net_change.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{data.sampling_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Current Biomass Breakdown */}
          {biomassData.pond_species_biomass && Object.keys(biomassData.pond_species_biomass).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Biomass Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pond - Species</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initial Biomass (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth Biomass (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Total Biomass (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(biomassData.pond_species_biomass).map(([pondSpecies, data]) => (
                      <tr key={pondSpecies}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pondSpecies}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{data.initial_biomass.toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{data.growth_biomass.toFixed(1)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{data.current_biomass.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Changes */}
          {biomassData.biomass_changes.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Biomass Changes</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pond</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Species</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biomass Change (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth Rate (kg/day)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Weight (kg)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Size</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {biomassData.biomass_changes.map((change) => (
                      <tr key={change.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.pond_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.species_name}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${change.biomass_difference_kg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {change.biomass_difference_kg >= 0 ? '+' : ''}{change.biomass_difference_kg.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {change.growth_rate_kg_per_day ? change.growth_rate_kg_per_day.toFixed(3) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.average_weight_kg.toFixed(3)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.sample_size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No biomass data available</h3>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or add some fish sampling data.</p>
        </div>
      )}
    </div>
  );
}
