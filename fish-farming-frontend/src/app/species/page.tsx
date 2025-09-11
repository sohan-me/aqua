'use client';

import { useState } from 'react';
import { useSpecies, useDeleteSpecies } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';
import { Fish, Plus, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SpeciesPage() {
  const { data: speciesData, isLoading } = useSpecies();
  const deleteSpecies = useDeleteSpecies();
  
  const species = speciesData?.data || [];

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete the species "${name}"? This action cannot be undone and will affect all related stocking records.`)) {
      try {
        await deleteSpecies.mutateAsync(id);
      } catch (error) {
        toast.error('Failed to delete species. It may be in use by existing stocking records.');
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
          <h1 className="text-3xl font-bold text-gray-900">Fish Species</h1>
          <p className="text-gray-600">Manage fish species for your farming operations</p>
        </div>
        <Link
          style={{color: "white"}}
          href="/species/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Species
        </Link>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Total Species</h3>
            <p className="text-3xl font-bold text-blue-600">{species.length}</p>
          </div>
          <div className="rounded-full bg-blue-100 p-3">
            <Fish className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Species List */}
      {species.length === 0 ? (
        <div className="text-center py-12">
          <Fish className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No species found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first fish species.</p>
          <div className="mt-6">
            <Link
              href="/species/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Species
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {species.map((spec) => (
            <div key={spec.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{spec.name}</h3>
                  <p className="text-sm text-gray-600 italic">{spec.scientific_name}</p>
                  {spec.description && (
                    <p className="text-sm text-gray-500 mt-2">{spec.description}</p>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <Link
                    href={`/species/${spec.id}`}
                    className="text-blue-600 hover:text-blue-900"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/species/${spec.id}/edit`}
                    className="text-green-600 hover:text-green-900"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(spec.id, spec.name)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete"
                    disabled={deleteSpecies.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">Created: {formatDate(spec.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
