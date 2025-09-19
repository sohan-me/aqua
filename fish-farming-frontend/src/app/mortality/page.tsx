'use client';

import { useMortalities, usePonds, useDeleteMortality, useStocking } from '@/hooks/useApi';
import { Mortality, Pond, Stocking } from '@/lib/api';
import { formatDate, formatWeight, extractApiData } from '@/lib/utils';
import { 
  Fish, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  TrendingDown, 
  AlertTriangle,
  Activity,
  Calculator
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function MortalityPage() {
  const { data: mortalitiesData, isLoading } = useMortalities();
  const { data: pondsData } = usePonds();
  const { data: stockingData } = useStocking();
  const deleteMortality = useDeleteMortality();
  
  const mortalities = extractApiData<Mortality>(mortalitiesData);
  const stockings = extractApiData<Stocking>(stockingData);

  const handleDelete = async (id: number, pondName: string, count: number, date: string) => {
    if (window.confirm(`Are you sure you want to delete the mortality record for ${pondName} (${count} fish) on ${formatDate(date)}? This action cannot be undone.`)) {
      try {
        await deleteMortality.mutateAsync(id);
      } catch (error) {
        toast.error('Failed to delete mortality record');
      }
    }
  };

  // Calculate mortality statistics
  const totalMortalities = mortalities.reduce((sum, mortality) => sum + mortality.count, 0);
  const totalStocked = stockings.reduce((sum, stocking) => sum + stocking.pcs, 0);
  const mortalityRate = totalStocked > 0 ? (totalMortalities / totalStocked) * 100 : 0;
  const avgMortalityPerDay = mortalities.length > 0 ? totalMortalities / mortalities.length : 0;

  // Get mortality by pond
  const mortalityByPond = mortalities.reduce((acc, mortality) => {
    const pondName = mortality.pond_name;
    if (!acc[pondName]) {
      acc[pondName] = { count: 0, records: 0 };
    }
    acc[pondName].count += mortality.count;
    acc[pondName].records += 1;
    return acc;
  }, {} as Record<string, { count: number; records: number }>);

  // Get mortality by cause
  const mortalityByCause = mortalities.reduce((acc, mortality) => {
    const cause = mortality.cause || 'Unknown';
    if (!acc[cause]) {
      acc[cause] = 0;
    }
    acc[cause] += mortality.count;
    return acc;
  }, {} as Record<string, number>);

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mortality Tracking</h1>
          <p className="text-sm md:text-base text-gray-600">Monitor fish mortality rates and causes</p>
        </div>
        <Link
          style={{color: "white"}}
          href="/mortality/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Mortality Record
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Mortalities</h3>
              <p className="text-3xl font-bold text-red-600">{totalMortalities}</p>
            </div>
            <div className="rounded-full bg-red-100 p-3">
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mortality Rate</h3>
              <p className="text-3xl font-bold text-orange-600">
                {mortalityRate.toFixed(4)}%
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Calculator className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Avg per Day</h3>
              <p className="text-3xl font-bold text-purple-600">
                {avgMortalityPerDay.toFixed(1)}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Records</h3>
              <p className="text-3xl font-bold text-blue-600">{mortalities.length}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <AlertTriangle className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Mortality Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mortality by Pond */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mortality by Pond</h3>
          {Object.keys(mortalityByPond).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(mortalityByPond).map(([pondName, data]) => (
                <div key={pondName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Fish className="h-5 w-5 text-blue-600 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">{pondName}</div>
                      <div className="text-sm text-gray-500">{data.records} records</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">{data.count} fish</div>
                    <div className="text-sm text-gray-500">
                      {((data.count / totalMortalities) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No mortality data by pond</p>
          )}
        </div>

        {/* Mortality by Cause */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mortality by Cause</h3>
          {Object.keys(mortalityByCause).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(mortalityByCause)
                .sort(([,a], [,b]) => b - a)
                .map(([cause, count]) => (
                <div key={cause} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">{cause}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">{count} fish</div>
                    <div className="text-sm text-gray-500">
                      {((count / totalMortalities) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No mortality data by cause</p>
          )}
        </div>
      </div>

      {/* Mortalities List */}
      {mortalities.length === 0 ? (
        <div className="text-center py-12">
          <Fish className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No mortality records</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by recording your first mortality event.</p>
          <div className="mt-6">
            <Link
              href="/mortality/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Mortality Record
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
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cause
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mortalities.map((mortality) => (
                  <tr key={mortality.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(mortality.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {mortality.pond_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {mortality.count} fish
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {mortality.avg_weight_g ? `${formatWeight(parseFloat(mortality.avg_weight_g) / 1000)} kg` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {mortality.cause || 'Not specified'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/mortality/${mortality.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/mortality/${mortality.id}/edit`}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(mortality.id, mortality.pond_name, mortality.count, mortality.date)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                          disabled={deleteMortality.isPending}
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
