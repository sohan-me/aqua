'use client';

import { useFishSampling, useDeleteFishSampling, useSpecies, usePonds } from '@/hooks/useApi';
import { Pond, Species } from '@/lib/api';
import { formatDate, extractApiData } from '@/lib/utils';
import { Scale, Plus, Eye, Edit, Trash2, Calendar, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';

export default function FishSamplingPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterPond, setFilterPond] = useState('all');
  const [filterSpecies, setFilterSpecies] = useState('all');
  
  // Call API without parameters since it returns all data
  const { data: samplingData, isLoading } = useFishSampling();
  console.log(samplingData);
  const { data: speciesData } = useSpecies();
  const { data: pondsData } = usePonds();
  const deleteSampling = useDeleteFishSampling();
  
  // Handle both array and paginated response formats
  const rawData = samplingData?.data;
  const allSamplings = Array.isArray(rawData) ? rawData : (rawData as any)?.results || [];
  console.log(allSamplings);
  
  // Apply client-side filtering
  const filteredSamplings = allSamplings.filter((sampling: any) => {
    const pondMatch = filterPond === 'all' || sampling.pond.toString() === filterPond;
    const speciesMatch = filterSpecies === 'all' || sampling.species?.toString() === filterSpecies;
    return pondMatch && speciesMatch;
  });
  
  // Apply client-side pagination
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const samplings = filteredSamplings.slice(startIndex, endIndex);
  
  const totalItems = filteredSamplings.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const species = extractApiData<Species>(speciesData?.data);
  const ponds = extractApiData<Pond>(pondsData?.data);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPond, filterSpecies]);


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
      <div className="md:flex justify-between items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Fish Sampling</h1>
          <p className="text-sm md:text-base text-gray-600">Monitor fish growth and health through regular sampling</p>
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
          <Scale className="h-5 w-5 text-gray-400 hidden md:block" />
          <div className="md:flex items-center space-x-4 space-y-4 md:space-y-0 w-full">
            <div className="w-full">
              {/* <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Pond</label> */}
              <select
                value={filterPond}
                onChange={(e) => setFilterPond(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Ponds</option>
                {ponds.map((pond) => (
                  <option key={pond.pond_id} value={pond.pond_id}>
                    {pond.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full">
              {/* <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Species</label> */}
              <select
                value={filterSpecies}
                onChange={(e) => setFilterSpecies(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Species</option>
                {species.map(speciesItem => (
                  <option key={speciesItem.id} value={speciesItem.id}>
                    {speciesItem.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end w-full">
              <button
                onClick={() => {
                  setFilterPond('all');
                  setFilterSpecies('all');
                }}
                className="w-full inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(filterPond !== 'all' || filterSpecies !== 'all') && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-800">Active Filters:</span>
              {filterPond !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Pond: {ponds.find(p => p.pond_id.toString() === filterPond)?.name}
                </span>
              )}
              {filterSpecies !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Species: {species.find(s => s.id.toString() === filterSpecies)?.name}
                </span>
              )}
            </div>
            <span className="text-sm text-blue-600">
              Showing {samplings.length} of {totalItems} filtered records
            </span>
          </div>
        </div>
      )}


      {/* Sampling Records */}
      {samplings.length === 0 ? (
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
          {samplings.map((sampling: any) => (
            <div key={sampling.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Scale className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {sampling.pond_name}
                    </h3>
                    {sampling.species_name && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {sampling.species_name}
                      </span>
                    )}
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

      {/* Pagination */}
      {totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          showPageSizeSelector={true}
        />
      )}
    </div>
  );
}
