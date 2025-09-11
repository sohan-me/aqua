'use client';

import { useState } from 'react';
import { useHarvests, usePonds, useDeleteHarvest } from '@/hooks/useApi';
import { formatDate, formatNumber } from '@/lib/utils';
import { Fish, Plus, Edit, Trash2, Eye, Scale, DollarSign, Package } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function HarvestPage() {
  const { data: harvestsData, isLoading } = useHarvests();
  const { data: pondsData } = usePonds();
  const deleteHarvest = useDeleteHarvest();
  
  const harvests = harvestsData?.data || [];
  const ponds = pondsData?.data || [];

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Harvests</h3>
              <p className="text-3xl font-bold text-blue-600">{harvests.length}</p>
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
                {harvests.reduce((sum, harvest) => sum + parseFloat(harvest.total_weight_kg || '0'), 0).toFixed(1)} kg
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
                ৳{harvests.reduce((sum, harvest) => sum + parseFloat(harvest.total_revenue || '0'), 0).toFixed(2)}
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
                {harvests.reduce((sum, harvest) => sum + harvest.total_count, 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Harvests List */}
      {harvests.length === 0 ? (
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
                {harvests.map((harvest) => (
                  <tr key={harvest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(harvest.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {harvest.pond_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {harvest.total_weight_kg} kg
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {harvest.total_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {harvest.avg_weight_g ? `${harvest.avg_weight_g} g` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {harvest.total_revenue ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          ৳{harvest.total_revenue}
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
    </div>
  );
}
