'use client';

import { useState, useMemo } from 'react';
import { useStocking, useSpecies, usePonds, useDeleteStocking } from '@/hooks/useApi';
import { Stocking, Species, Pond } from '@/lib/api';
import { formatDate, formatNumber, extractApiData } from '@/lib/utils';
import { Fish, Plus, Package, Edit, Trash2, Eye, Filter, X, Calendar } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function StockingPage() {
  const { data: stockingData, isLoading } = useStocking();
  const { data: speciesData } = useSpecies();
  const { data: pondsData } = usePonds();
  const deleteStocking = useDeleteStocking();
  
  const stockings = extractApiData<Stocking>(stockingData?.data);
  const species = extractApiData<Species>(speciesData?.data);
  const ponds = extractApiData<Pond>(pondsData?.data);

  // Date range and pond filtering state
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filterPond, setFilterPond] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter stockings based on date range and pond
  const filteredStockings = useMemo(() => {
    return stockings.filter(stocking => {
      // Date range filtering
      const stockingDate = new Date(stocking.date);
      const startDate = dateRange.startDate ? new Date(dateRange.startDate) : null;
      const endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;

      let dateMatch = true;
      if (startDate && endDate) {
        dateMatch = stockingDate >= startDate && stockingDate <= endDate;
      } else if (startDate) {
        dateMatch = stockingDate >= startDate;
      } else if (endDate) {
        dateMatch = stockingDate <= endDate;
      }

      // Pond filtering
      const pondMatch = !filterPond || stocking.pond === parseInt(filterPond);

      return dateMatch && pondMatch;
    });
  }, [stockings, dateRange, filterPond]);

  const handleDelete = async (id: number, pondName: string, speciesName: string) => {
    if (window.confirm(`Are you sure you want to delete the stocking record for ${speciesName} in ${pondName}? This action cannot be undone.`)) {
      try {
        await deleteStocking.mutateAsync(id);
      } catch (error) {
        toast.error('Failed to delete stocking record');
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
          <h1 className="text-3xl font-bold text-gray-900">Stocking Records</h1>
          <p className="text-gray-600">Track fish stocking activities</p>
        </div>
        <Link
          style={{color: "white"}}
          href="/stocking/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Stocking
        </Link>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Filter Stocking Records</h3>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  text-gray-900 placeholder-gray-500 bg-white" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  text-gray-900 placeholder-gray-500 bg-white" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Pond
              </label>
              <select
                value={filterPond}
                onChange={(e) => setFilterPond(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500  text-gray-900 placeholder-gray-500 bg-white"
              >
                <option value="">All Ponds</option>
                {ponds.map((pond) => (
                  <option key={pond.id} value={pond.id}>
                    {pond.name} ({pond.area_decimal} decimal)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setDateRange({ startDate: '', endDate: '' });
                  setFilterPond('');
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
        {(dateRange.startDate || dateRange.endDate || filterPond) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="flex items-center">
              <Filter className="h-4 w-4 text-blue-400 mr-2" />
              <span className="text-sm text-blue-700">
                Showing stocking records{' '}
                {dateRange.startDate || dateRange.endDate ? (
                  <>
                    from{' '}
                    {dateRange.startDate ? formatDate(dateRange.startDate) : 'beginning'} to{' '}
                    {dateRange.endDate ? formatDate(dateRange.endDate) : 'now'}
                  </>
                ) : null}
                {dateRange.startDate || dateRange.endDate ? ' and ' : ''}
                {filterPond && `for Pond: ${ponds.find(p => p.id === parseInt(filterPond))?.name || 'Unknown'}`}
                {' '}({filteredStockings.length} records)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Total Stocking Records</h3>
            <p className="text-3xl font-bold text-blue-600">{filteredStockings.length}</p>
          </div>
          <div className="rounded-full bg-blue-100 p-3">
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Stocking List */}
      {filteredStockings.length === 0 ? (
        <div className="text-center py-12">
          <Fish className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No stocking records</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by recording your first stocking.</p>
          <div className="mt-6">
            <Link
              href="/stocking/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Stocking
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
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pieces per kg
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStockings.map((stocking) => (
                  <tr key={stocking.stocking_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(stocking.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stocking.pond_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stocking.species_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(stocking.pcs, 0)} pieces
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(parseFloat(stocking.initial_avg_weight_kg), 4)} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stocking.pieces_per_kg ? formatNumber(parseFloat(stocking.pieces_per_kg), 2) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {formatNumber(parseFloat(stocking.total_weight_kg), 3)} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/stocking/${stocking.stocking_id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/stocking/${stocking.stocking_id}/edit`}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(stocking.stocking_id, stocking.pond_name, stocking.species_name)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                          disabled={deleteStocking.isPending}
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
    </div>
  );
}
