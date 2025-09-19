'use client';

import { useFeeds, usePonds, useDeleteFeed, useFeedTypes } from '@/hooks/useApi';
import { Feed, Pond, FeedType } from '@/lib/api';
import { formatDate, extractApiData } from '@/lib/utils';
import { Fish, Plus, Edit, Trash2, Eye, Package, Clock } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function FeedingPage() {
  const { data: feedsData, isLoading } = useFeeds();
  const { data: pondsData } = usePonds();
  const { data: feedTypesData } = useFeedTypes();
  const deleteFeed = useDeleteFeed();
  
  const feeds = extractApiData<Feed>(feedsData);
  const feedTypes = extractApiData<FeedType>(feedTypesData);

  const handleDelete = async (id: number, pondName: string, feedTypeName: string, date: string) => {
    if (window.confirm(`Are you sure you want to delete the feeding record for ${pondName} (${feedTypeName}) on ${formatDate(date)}? This action cannot be undone.`)) {
      try {
        await deleteFeed.mutateAsync(id);
      } catch (error) {
        toast.error('Failed to delete feeding record');
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
          <h1 className="text-3xl font-bold text-gray-900">Feeding Management</h1>
          <p className="text-gray-600">Track feeding records and schedules</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/feed-types"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Package className="h-4 w-4 mr-2" />
            Manage Feed Types
          </Link>
          <Link
            href="/feeding/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Feeding Record
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Feedings</h3>
              <p className="text-3xl font-bold text-blue-600">{feeds.length}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Fish className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Feed Amount</h3>
              <p className="text-3xl font-bold text-green-600">
                {feeds.reduce((sum, feed) => sum + parseFloat(feed.amount_kg || '0'), 0).toFixed(1)} kg
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3">
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Feed Cost</h3>
              <p className="text-3xl font-bold text-blue-600">
                ৳{feeds.reduce((sum, feed) => sum + parseFloat(feed.total_cost || '0'), 0).toFixed(4)}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Active Ponds</h3>
              <p className="text-3xl font-bold text-purple-600">
                {new Set(feeds.map(feed => feed.pond)).size}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3">
              <Fish className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Feed Types Used</h3>
              <p className="text-3xl font-bold text-orange-600">
                {new Set(feeds.map(feed => feed.feed_type)).size}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3">
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Feed Types Summary */}
      {feedTypes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Feed Types Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedTypes.slice(0, 6).map((feedType) => {
              const feedCount = feeds.filter(feed => feed.feed_type === feedType.id).length;
              const totalAmount = feeds
                .filter(feed => feed.feed_type === feedType.id)
                .reduce((sum, feed) => sum + parseFloat(feed.amount_kg || '0'), 0);
              
              return (
                <div key={feedType.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-orange-600 mr-2" />
                      <h4 className="text-sm font-medium text-gray-900">{feedType.name}</h4>
                    </div>
                    {feedType.protein_content && (
                      <span className="text-xs text-gray-500">{feedType.protein_content}% protein</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Used {feedCount} times</div>
                    <div>Total: {totalAmount.toFixed(1)} kg</div>
                    {feedType.description && (
                      <div className="text-gray-500 truncate">{feedType.description}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feeds List */}
      {feeds.length === 0 ? (
        <div className="text-center py-12">
          <Fish className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No feeding records</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by recording your first feeding session.</p>
          <div className="mt-6">
            <Link
              href="/feeding/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Feeding Record
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
                    Feed Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feeds.map((feed) => (
                  <tr key={feed.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(feed.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {feed.pond_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-orange-600 mr-2" />
                        {feed.feed_type_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {parseFloat(feed.amount_kg).toFixed(4)} kg
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {feed.total_cost ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          ৳{parseFloat(feed.total_cost).toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {feed.feeding_time ? (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          {feed.feeding_time}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          href={`/feeding/${feed.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/feeding/${feed.id}/edit`}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(feed.id, feed.pond_name, feed.feed_type_name, feed.date)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                          disabled={deleteFeed.isPending}
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
