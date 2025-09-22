'use client';

import { useState } from 'react';
import { useSamplings, usePonds, useDeleteSampling, useSampleTypes } from '@/hooks/useApi';
import { Sampling, Pond, SampleType } from '@/lib/api';
import { formatDate, formatNumber, extractApiData } from '@/lib/utils';
import { Droplets, Plus, Edit, Trash2, Eye, Thermometer, TestTube, Fish } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function WaterQualityPage() {
  const { data: samplingsData, isLoading } = useSamplings();
  const { data: pondsData } = usePonds();
  const { data: sampleTypesData } = useSampleTypes();
  const deleteSampling = useDeleteSampling();
  
  const samplings = extractApiData<Sampling>(samplingsData?.data);
  const ponds = extractApiData<Pond>(pondsData?.data);
  const sampleTypes = extractApiData<SampleType>(sampleTypesData?.data);

  const handleDelete = async (id: number, pondName: string, sampleType: string, date: string) => {
    if (window.confirm(`Are you sure you want to delete the ${sampleType} sample for ${pondName} on ${formatDate(date)}? This action cannot be undone.`)) {
      try {
        await deleteSampling.mutateAsync(id);
      } catch (error) {
        toast.error('Failed to delete water quality sample');
      }
    }
  };

  const getSampleTypeIcon = (sampleTypeName: string) => {
    switch (sampleTypeName) {
      case 'water':
        return <Droplets className="h-4 w-4 text-blue-600" />;
      case 'fish':
        return <Fish className="h-4 w-4 text-green-600" />;
      case 'sediment':
        return <TestTube className="h-4 w-4 text-orange-600" />;
      case 'algae':
        return <TestTube className="h-4 w-4 text-green-600" />;
      case 'bacteria':
        return <TestTube className="h-4 w-4 text-purple-600" />;
      default:
        return <TestTube className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSampleTypeColor = (sampleTypeName: string) => {
    switch (sampleTypeName) {
      case 'water':
        return 'bg-blue-100 text-blue-800';
      case 'fish':
        return 'bg-green-100 text-green-800';
      case 'sediment':
        return 'bg-orange-100 text-orange-800';
      case 'algae':
        return 'bg-green-100 text-green-800';
      case 'bacteria':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold text-gray-900">Water Quality Management</h1>
          <p className="text-gray-600">Track water quality parameters and sampling records</p>
        </div>
        <Link
          style={{color: "white"}}
          href="/water-quality/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Sample
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Samples</h3>
              <p className="text-3xl font-bold text-blue-600">{samplings.length}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <TestTube className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {sampleTypes.slice(0, 3).map((sampleType) => (
          <div key={sampleType.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{sampleType.description}</h3>
                <p className={`text-3xl font-bold ${
                  sampleType.color === 'blue' ? 'text-blue-600' :
                  sampleType.color === 'green' ? 'text-green-600' :
                  sampleType.color === 'orange' ? 'text-orange-600' :
                  sampleType.color === 'purple' ? 'text-purple-600' :
                  'text-gray-600'
                }`}>
                  {samplings.filter(s => s.sample_type_name === sampleType.name).length}
                </p>
              </div>
              <div className={`rounded-full p-3 ${
                sampleType.color === 'blue' ? 'bg-blue-100' :
                sampleType.color === 'green' ? 'bg-green-100' :
                sampleType.color === 'orange' ? 'bg-orange-100' :
                sampleType.color === 'purple' ? 'bg-purple-100' :
                'bg-gray-100'
              }`}>
                {getSampleTypeIcon(sampleType.name)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Samples List */}
      {samplings.length === 0 ? (
        <div className="text-center py-12">
          <TestTube className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No water quality samples</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by recording your first water quality sample.</p>
          <div className="mt-6">
            <Link
              href="/water-quality/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sample
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
                    Sample Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    pH
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temperature
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {samplings.map((sampling) => (
                  <tr key={sampling.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(sampling.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sampling.pond_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSampleTypeColor(sampling.sample_type_name)}`}>
                        {getSampleTypeIcon(sampling.sample_type_name)}
                        <span className="ml-1 capitalize">{sampling.sample_type_name}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sampling.ph || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sampling.temperature_c ? `${sampling.temperature_c}°C` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sampling.dissolved_oxygen ? `${sampling.dissolved_oxygen} mg/L` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/water-quality/${sampling.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/water-quality/${sampling.id}/edit`}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(sampling.id, sampling.pond_name, sampling.sample_type_name, sampling.date)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                          disabled={deleteSampling.isPending}
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
