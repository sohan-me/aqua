'use client';

import { useMortalityById } from '@/hooks/useApi';
import { formatDate, formatWeight } from '@/lib/utils';
import { 
  ArrowLeft, 
  Calendar, 
  Fish, 
  AlertTriangle, 
  Scale, 
  FileText,
  TrendingDown,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function MortalityDetailsPage() {
  const params = useParams();
  const mortalityId = params.id as string;
  const { data: mortalityData, isLoading, error } = useMortalityById(parseInt(mortalityId));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error || !mortalityData?.data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Mortality record not found</h3>
        <p className="mt-1 text-sm text-gray-500">The mortality record you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link
            href="/mortality"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Mortality Records
          </Link>
        </div>
      </div>
    );
  }

  const mortality = mortalityData.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/mortality"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mortality Details</h1>
            <p className="text-gray-600">Detailed information about this mortality record</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <div className="rounded-full bg-red-100 p-3 mr-4">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Mortality Overview</h2>
                <p className="text-gray-600">Recorded on {formatDate(mortality.date)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Pond</p>
                    <p className="text-lg font-semibold text-gray-900">{mortality.pond_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Fish className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Species</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {'Mixed'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Fish Count</p>
                    <p className="text-lg font-semibold text-red-600">{mortality.count} fish</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Scale className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Average Weight</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {mortality.avg_weight_g ? `${formatWeight(parseFloat(mortality.avg_weight_g) / 1000)} kg` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cause and Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Cause and Analysis
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cause of Mortality</label>
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                  <p className="text-orange-800 font-medium">
                    {mortality.cause || 'Not specified'}
                  </p>
                </div>
              </div>
              
              {mortality.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-gray-700">{mortality.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Weight Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Scale className="h-5 w-5 mr-2 text-blue-600" />
              Weight Information
            </h3>
            
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Total Weight Loss</p>
                <p className="text-2xl font-bold text-blue-900">
                  {mortality.avg_weight_g ? `${formatWeight((parseFloat(mortality.avg_weight_g) * mortality.count) / 1000)} kg` : 'N/A'}
                </p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 font-medium">Average Weight per Fish</p>
                <p className="text-xl font-semibold text-gray-900">
                  {mortality.avg_weight_g ? `${formatWeight(parseFloat(mortality.avg_weight_g) / 1000)} kg` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Record Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-green-600" />
              Record Information
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Record ID</span>
                <span className="text-sm font-medium text-gray-900">#{mortality.id}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Date Recorded</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(mortality.date)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(mortality.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            
            <div className="space-y-3">
              <Link
                href="/mortality"
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Back to List
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
