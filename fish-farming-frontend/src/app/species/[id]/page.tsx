'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeciesById } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Edit, Trash2, Fish, Calendar } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface SpeciesDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SpeciesDetailPage({ params }: SpeciesDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { data: speciesData, isLoading } = useSpeciesById(parseInt(id));
  
  const species = speciesData?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!species) {
    return (
      <div className="text-center py-12">
        <Fish className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Species not found</h3>
        <p className="mt-1 text-sm text-gray-500">The species you're looking for doesn't exist.</p>
        <div className="mt-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{species.name}</h1>
            <p className="text-gray-600 mt-1 italic">{species.scientific_name}</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/species/${species.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Fish className="h-5 w-5 mr-2" />
              Basic Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Common Name</label>
                <p className="mt-1 text-sm text-gray-900">{species.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Scientific Name</label>
                <p className="mt-1 text-sm text-gray-900 italic">{species.scientific_name}</p>
              </div>
              
              {species.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{species.description}</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                href={`/species/${species.id}/edit`}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Species
              </Link>
              
              <Link
                href="/stocking/new"
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Fish className="h-4 w-4 mr-2" />
                Stock This Species
              </Link>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Metadata
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(species.created_at)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Species ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">#{species.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
