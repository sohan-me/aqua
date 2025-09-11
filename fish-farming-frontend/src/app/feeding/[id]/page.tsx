'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFeedById } from '@/hooks/useApi';
import { ArrowLeft, Edit, Fish, Clock, Package, Calendar } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import Link from 'next/link';

export default function FeedingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const feedId = parseInt(params.id as string);
  
  const { data: feed, isLoading } = useFeedById(feedId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!feed) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Feeding Record Not Found</h2>
        <p className="text-gray-600 mb-6">The feeding record you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/feeding')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Feeding
        </button>
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
            <h1 className="text-3xl font-bold text-gray-900">Feeding Record Details</h1>
            <p className="text-gray-600 mt-1">
              {feed.data.pond_name} - {formatDate(feed.data.date)}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href={`/feeding/${feedId}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Package className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Feed Type</p>
              <p className="text-lg font-semibold text-gray-900">{feed.data.feed_type_name}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Fish className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Feed Amount</p>
              <p className="text-2xl font-semibold text-gray-900">{feed.data.amount_kg} kg</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Feeding Time</p>
              <p className="text-lg font-semibold text-gray-900">
                {feed.data.feeding_time || 'Not specified'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Date</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(feed.data.date)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Pond:</span>
              <span className="text-sm font-medium">{feed.data.pond_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Date:</span>
              <span className="text-sm font-medium">{formatDate(feed.data.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Feed Type:</span>
              <span className="text-sm font-medium">{feed.data.feed_type_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Created:</span>
              <span className="text-sm font-medium">{formatDate(feed.data.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Feeding Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Amount:</span>
              <span className="text-sm font-medium">{feed.data.amount_kg} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Feeding Time:</span>
              <span className="text-sm font-medium">
                {feed.data.feeding_time ? (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-gray-400 mr-1" />
                    {feed.data.feeding_time}
                  </div>
                ) : (
                  'Not specified'
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {feed.data.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{feed.data.notes}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            href={`/feeding/${feedId}/edit`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Edit className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Edit Record</span>
          </Link>
          
          <Link
            href={`/ponds/${feed.data.pond}`}
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Fish className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-sm font-medium">View Pond</span>
          </Link>
          
          <Link
            href="/feeding"
            className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Package className="h-6 w-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium">All Feedings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
