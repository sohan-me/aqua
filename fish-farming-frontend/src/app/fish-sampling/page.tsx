'use client';

import { useFishSampling, useDeleteFishSampling } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';
import { Scale, Plus, Eye, Edit, Trash2, Calendar, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function FishSamplingPage() {
  const { data: samplingData, isLoading } = useFishSampling();
  const deleteSampling = useDeleteFishSampling();
  const [filterPond, setFilterPond] = useState('all');
  const [biomassSummary, setBiomassSummary] = useState<any>(null);
  
  const samplings = samplingData?.data || [];
  
  const filteredSamplings = filterPond === 'all' 
    ? samplings 
    : samplings.filter(sampling => sampling.pond.toString() === filterPond);

  // Fetch biomass summary
  useEffect(() => {
    const fetchBiomassSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/fish-farming/fish-sampling/biomass_analysis/', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setBiomassSummary(data);
        }
      } catch (error) {
        console.error('Failed to fetch biomass summary:', error);
      }
    };

    fetchBiomassSummary();
  }, [samplings]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this fish sampling record?')) {
      try {
        await deleteSampling.mutateAsync(id);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fish Sampling</h1>
          <p className="text-gray-600">Monitor fish growth and health through regular sampling</p>
        </div>
        <Link
          href="/fish-sampling/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Sampling
        </Link>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <Scale className="h-5 w-5 text-gray-400" />
          <select
            value={filterPond}
            onChange={(e) => setFilterPond(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Ponds</option>
            {Array.from(new Set(samplings.map(s => s.pond_name))).map(pondName => (
              <option key={pondName} value={samplings.find(s => s.pond_name === pondName)?.pond}>
                {pondName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Biomass Summary */}
      {biomassSummary && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-indigo-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Current Biomass Summary</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center">
                <Scale className="h-8 w-8 text-indigo-600" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-indigo-600">Total Current Biomass</h3>
                  <p className="text-2xl font-bold text-indigo-900">
                    {biomassSummary.summary?.total_current_biomass_kg?.toFixed(1) || '0.0'} kg
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-600">Total Growth</h3>
                  <p className="text-2xl font-bold text-green-900">
                    {biomassSummary.summary?.total_biomass_gain_kg?.toFixed(1) || '0.0'} kg
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-600">Total Samplings</h3>
                  <p className="text-2xl font-bold text-blue-900">
                    {biomassSummary.summary?.total_samplings || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Detailed breakdown */}
          {biomassSummary.pond_species_biomass && Object.keys(biomassSummary.pond_species_biomass).length > 0 && (
            <div className="mt-6">
              <h3 className="text-md font-semibold text-gray-900 mb-3">Biomass by Pond & Species</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pond - Species</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initial (kg)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth (kg)</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Total (kg)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(biomassSummary.pond_species_biomass).map(([pondSpecies, data]: [string, any]) => (
                      <tr key={pondSpecies}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{pondSpecies}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{data.initial_biomass.toFixed(1)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600">{data.growth_biomass.toFixed(1)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-indigo-600">{data.current_biomass.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sampling Records */}
      {filteredSamplings.length === 0 ? (
        <div className="text-center py-12">
          <Scale className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No fish sampling records</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by recording your first fish sampling.</p>
          <div className="mt-6">
            <Link
              href="/fish-sampling/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Record Fish Sampling
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredSamplings.map((sampling) => (
            <div key={sampling.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Scale className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {sampling.pond_name}
                    </h3>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {sampling.sample_size} fish sampled
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Weight</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {parseFloat(sampling.total_weight_kg).toFixed(3)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Average Weight</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {parseFloat(sampling.average_weight_kg).toFixed(1)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fish per kg</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {parseFloat(sampling.fish_per_kg).toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Growth Rate</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {sampling.growth_rate_kg_per_day ? `${parseFloat(sampling.growth_rate_kg_per_day).toFixed(3)} kg/day` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Biomass Change</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {sampling.biomass_difference_kg ? `${parseFloat(sampling.biomass_difference_kg).toFixed(1)} kg` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Condition Factor</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {sampling.condition_factor ? parseFloat(sampling.condition_factor).toFixed(3) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{formatDate(sampling.date)}</span>
                    </div>
                    <span>By: {sampling.user_username}</span>
                  </div>
                  
                  {sampling.notes && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600">
                        <strong>Notes:</strong> {sampling.notes}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex space-x-2">
                  <Link
                    href={`/fish-sampling/${sampling.id}`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Link>
                  <Link
                    href={`/fish-sampling/${sampling.id}/edit`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(sampling.id)}
                    disabled={deleteSampling.isPending}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
