'use client';

import { useState, useMemo } from 'react';
import { useHarvests, usePonds, useSpecies, useDeleteHarvest } from '@/hooks/useApi';
import { formatDate, toNumber, extractApiData } from '@/lib/utils';
import { Fish, Plus, Edit, Trash2, Eye, Scale, DollarSign, Package, Filter, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';
import { Harvest, Pond, Species } from '@/lib/api';

export default function HarvestPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Filtering state
  const [filterPond, setFilterPond] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const paginationParams = {
    page: currentPage,
    page_size: pageSize,
  };
  
  const { data: harvestsData, isLoading } = useHarvests(paginationParams);
  const { data: pondsData } = usePonds();
  const { data: speciesData } = useSpecies();
  const deleteHarvest = useDeleteHarvest();
  
  const harvests = extractApiData<Harvest>(harvestsData);
  const ponds = extractApiData<Pond>(pondsData);
  const species = extractApiData<Species>(speciesData);
  
  // Filter harvests based on selected filters
  const filteredHarvests = useMemo(() => {
    return harvests.filter(harvest => {
      const pondMatch = !filterPond || harvest.pond === parseInt(filterPond);
      const speciesMatch = !filterSpecies || species.find(s => s.id === parseInt(filterSpecies))?.name === harvest.species_name;
      return pondMatch && speciesMatch;
    });
  }, [harvests, filterPond, filterSpecies, species]);
  
  const totalItems = filteredHarvests.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const handleDelete = async (id: number, pondName: string, weight: string, date: string) => {
    if (window.confirm(`Are you sure you want to delete the harvest record for ${pondName} (${weight}kg) on ${formatDate(date)}? This action cannot be undone.`)) {
      try {
        await deleteHarvest.mutateAsync(id);
      } catch (error) {
        toast.error('Failed to delete harvest record');
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
          <h1 className="text-3xl font-bold text-gray-900">Harvest Management</h1>
          <p className="text-gray-600">Track harvest records and revenue</p>
        </div>
        <Link
          style={{color: "white"}}
          href="/harvest/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Harvest Record
        </Link>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Filter Harvest Records</h3>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Pond
              </label>
              <select
                value={filterPond}
                onChange={(e) => setFilterPond(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3"
              >
                <option value="">All Ponds</option>
                {ponds.map((pond) => (
                  <option key={pond.id} value={pond.id}>
                    {pond.name} ({pond.area_decimal} decimal)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Species
              </label>
              <select
                value={filterSpecies}
                onChange={(e) => setFilterSpecies(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-3"
              >
                <option value="">All Species</option>
                {species.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterPond('');
                  setFilterSpecies('');
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {(filterPond || filterSpecies) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-blue-400 mr-2" />
              <span className="text-sm text-blue-700">
                Showing harvest records for{' '}
                {filterPond && `Pond: ${ponds.find(p => p.id === parseInt(filterPond))?.name || 'Unknown'}`}
                {filterPond && filterSpecies && ' and '}
                {filterSpecies && `Species: ${species.find(s => s.id === parseInt(filterSpecies))?.name || 'Unknown'}`}
                {' '}({filteredHarvests.length} records)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Harvests</h3>
              <p className="text-3xl font-bold text-blue-600">{filteredHarvests.length}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Fish className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Weight</h3>
              <p className="text-3xl font-bold text-green-600">
                {filteredHarvests.reduce((sum, harvest) => sum + parseFloat(harvest.total_weight_kg || '0'), 0).toFixed(4)} kg
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <Scale className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
              <p className="text-3xl font-bold text-purple-600">
                ৳{filteredHarvests.reduce((sum, harvest) => sum + parseFloat(harvest.total_revenue || '0'), 0).toFixed(4)}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Fish</h3>
              <p className="text-3xl font-bold text-orange-600">
                {filteredHarvests.reduce((sum, harvest) => sum + (harvest.total_count || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Harvests List */}
      {filteredHarvests.length === 0 ? (
        <div className="text-center py-12">
          <Fish className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No harvest records</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by recording your first harvest.</p>
          <div className="mt-6">
            <Link
              href="/harvest/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Harvest Record
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pond
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Species
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHarvests.map((harvest) => (
                  <tr key={harvest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(harvest.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {harvest.pond_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {harvest.species_name || 'Unknown Species'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {toNumber(harvest.total_weight_kg).toFixed(4)} kg
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {harvest.total_count ? harvest.total_count.toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {harvest.avg_weight_kg && toNumber(harvest.avg_weight_kg) > 0 ? `${(toNumber(harvest.avg_weight_kg) * 1000).toFixed(4)} g` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {harvest.total_revenue ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          ৳{parseFloat(harvest.total_revenue).toFixed(4)}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/harvest/${harvest.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/harvest/${harvest.id}/edit`}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(harvest.id, harvest.pond_name, harvest.total_weight_kg, harvest.date)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                          disabled={deleteHarvest.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
