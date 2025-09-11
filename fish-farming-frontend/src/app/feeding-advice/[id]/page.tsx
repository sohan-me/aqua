'use client';

import { useFeedingAdviceById, useDeleteFeedingAdvice, useApplyFeedingAdvice } from '@/hooks/useApi';
import { formatDate } from '@/lib/utils';
import { Lightbulb, ArrowLeft, Edit, Trash2, Calendar, User, CheckCircle, Clock, Thermometer, Droplets } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PageProps {
  params: {
    id: string;
  };
}

export default function FeedingAdviceDetailPage({ params }: PageProps) {
  const router = useRouter();
  const adviceId = parseInt(params.id as string);
  
  const { data: advice, isLoading } = useFeedingAdviceById(adviceId);
  const deleteAdvice = useDeleteFeedingAdvice();
  const applyAdvice = useApplyFeedingAdvice();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this feeding advice?')) {
      try {
        await deleteAdvice.mutateAsync(adviceId);
        toast.success('Feeding advice deleted successfully');
        router.push('/feeding-advice');
      } catch (error) {
        toast.error('Failed to delete feeding advice');
      }
    }
  };

  const handleApplyAdvice = async () => {
    try {
      await applyAdvice.mutateAsync(adviceId);
    } catch (error) {
      toast.error('Failed to apply feeding advice');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!advice) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Feeding advice not found</h3>
        <p className="mt-1 text-sm text-gray-500">The feeding advice you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link
            href="/feeding-advice"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Feeding Advice
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/feeding-advice"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Feeding Advice
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feeding Advice Details</h1>
            <p className="text-gray-600">AI-powered feeding recommendations</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/feeding-advice/${adviceId}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
            {!advice.data.is_applied && (
              <button
                onClick={handleApplyAdvice}
                disabled={applyAdvice.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Apply Advice
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleteAdvice.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Status Banner */}
        <div className={`rounded-lg p-4 ${advice.data.is_applied ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center">
            {advice.data.is_applied ? (
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            ) : (
              <Clock className="h-5 w-5 text-yellow-600 mr-2" />
            )}
            <span className={`font-medium ${advice.data.is_applied ? 'text-green-800' : 'text-yellow-800'}`}>
              {advice.data.is_applied ? 'Advice Applied' : 'Pending Application'}
            </span>
            {advice.data.applied_date && (
              <span className={`ml-2 text-sm ${advice.data.is_applied ? 'text-green-600' : 'text-yellow-600'}`}>
                Applied on {formatDate(advice.data.applied_date)}
              </span>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-blue-600" />
            Basic Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Pond</h3>
              <p className="text-lg font-semibold text-gray-900">{advice.data.pond_name}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Advice Date</h3>
              <p className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                {formatDate(advice.data.date)}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Generated By</h3>
              <p className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="h-4 w-4 mr-2" />
                {advice.data.user_username}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Season</h3>
              <p className="text-lg font-semibold text-gray-900 capitalize">{advice.data.season}</p>
            </div>
          </div>
        </div>

        {/* Fish Data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fish Data</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-700 mb-2">Fish Count</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {advice.data.estimated_fish_count.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-700 mb-2">Average Weight</h3>
                <p className="text-2xl font-bold text-green-900">
                  {parseFloat(advice.data.average_fish_weight_g).toFixed(1)} g
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-700 mb-2">Total Biomass</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {parseFloat(advice.data.total_biomass_kg).toFixed(1)} kg
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Environmental Conditions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Environmental Conditions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <Thermometer className="h-4 w-4 mr-2" />
                Water Temperature
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {advice.data.water_temp_c ? `${parseFloat(advice.data.water_temp_c).toFixed(1)}°C` : 'Not specified'}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                <Droplets className="h-4 w-4 mr-2" />
                Season
              </h3>
              <p className="text-lg font-semibold text-gray-900 capitalize">{advice.data.season}</p>
            </div>
          </div>
        </div>

        {/* Feeding Recommendations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feeding Recommendations</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Recommended Daily Feed</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {parseFloat(advice.data.recommended_feed_kg).toFixed(2)} kg/day
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Feeding Rate</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {parseFloat(advice.data.feeding_rate_percent).toFixed(1)}% of biomass
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Feeding Frequency</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {advice.data.feeding_frequency} times per day
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              {advice.data.feed_type_name && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Recommended Feed Type</h3>
                  <p className="text-lg font-semibold text-gray-900">{advice.data.feed_type_name}</p>
                </div>
              )}
              
              {advice.data.daily_feed_cost && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Daily Feed Cost</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    ${parseFloat(advice.data.daily_feed_cost).toFixed(2)}
                  </p>
                </div>
              )}
              
              {advice.data.feed_cost_per_kg && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Feed Cost per kg</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    ${parseFloat(advice.data.feed_cost_per_kg).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {advice.data.notes && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes & Observations</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{advice.data.notes}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Created:</span> {formatDate(advice.data.created_at)}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {formatDate(advice.data.updated_at)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
