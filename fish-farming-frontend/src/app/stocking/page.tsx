'use client';

import { useState } from 'react';
import { useStocking, useSpecies, usePonds, useDeleteStocking } from '@/hooks/useApi';
import { formatDate, formatNumber } from '@/lib/utils';
import { Fish, Plus, Package, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function StockingPage() {
  const { data: stockingData, isLoading } = useStocking();
  const { data: speciesData } = useSpecies();
  const { data: pondsData } = usePonds();
  const deleteStocking = useDeleteStocking();
  
  const stockings = stockingData?.data || [];
  const species = speciesData?.data || [];
  const ponds = pondsData?.data || [];

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

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Total Stocking Records</h3>
            <p className="text-3xl font-bold text-blue-600">{stockings.length}</p>
          </div>
          <div className="rounded-full bg-blue-100 p-3">
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Stocking List */}
      {stockings.length === 0 ? (
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
                    Total Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockings.map((stocking) => (
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
                      {formatNumber(parseFloat(stocking.initial_avg_g), 3)} g
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {formatNumber(parseFloat(stocking.total_weight_kg), 2)} kg
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
