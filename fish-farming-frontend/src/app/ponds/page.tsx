  'use client';

  import { usePonds } from '@/hooks/useApi';
  import { Pond } from '@/lib/api';
  import { formatDate, extractApiData } from '@/lib/utils';
  import { Fish, Plus, MapPin, Droplets, Activity } from 'lucide-react';
  import Link from 'next/link';

  export default function PondsPage() {
    const { data: pondsData, isLoading } = usePonds();
    console.log(pondsData)
    const ponds = extractApiData<Pond>(pondsData?.data);
    console.log(ponds)
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
            <h1 className="text-3xl font-bold text-gray-900">Ponds</h1>
            <p className="text-gray-600">Manage your fish farming ponds</p>
          </div>
          <Link
          style={{color: "white"}}
            href="/ponds/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Pond
          </Link>
        </div>

        {ponds.length === 0 ? (
          <div className="text-center py-12">
            <Fish className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No ponds</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new pond.</p>
            <div className="mt-6">
              <Link
                href="/ponds/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Pond
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ponds.map((pond) => (
              <div key={pond.pond_id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{pond.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      pond.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pond.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Droplets className="h-4 w-4 mr-2 text-blue-500" />
                      <span>Area: {parseFloat(pond.water_area_decimal).toFixed(3)} decimal</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <Activity className="h-4 w-4 mr-2 text-green-500" />
                      <span>Depth: {parseFloat(pond.depth_ft).toFixed(1)} ft</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <Fish className="h-4 w-4 mr-2 text-purple-500" />
                      <span>Volume: {parseFloat(pond.volume_m3).toFixed(1)} m³</span>
                    </div>
                    
                    {pond.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 text-red-500" />
                        <span>{pond.location}</span>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(pond.created_at)}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <div className="flex space-x-3">
                    <Link
                      href={`/ponds/${pond.pond_id}`}
                      className="flex-1 text-center text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/ponds/${pond.pond_id}/edit`}
                      className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-500"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
