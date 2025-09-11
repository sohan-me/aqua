'use client';

import { useAlertById, useResolveAlert } from '@/hooks/useApi';
import { formatDateTime } from '@/lib/utils';
import { AlertTriangle, CheckCircle, ArrowLeft, Clock, MapPin, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface AlertDetailPageProps {
  params: {
    id: string;
  };
}

export default function AlertDetailPage({ params }: AlertDetailPageProps) {
  const router = useRouter();
  const { data: alertData, isLoading } = useAlertById(parseInt(params.id));
  const resolveAlertMutation = useResolveAlert();
  
  const alert = alertData?.data;

  const handleResolveAlert = () => {
    if (alert && !alert.is_resolved) {
      resolveAlertMutation.mutate(alert.id, {
        onSuccess: () => {
          toast.success('Alert resolved successfully!');
          router.push('/alerts');
        },
        onError: () => {
          toast.error('Failed to resolve alert');
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Alert not found</h3>
        <p className="mt-1 text-sm text-gray-500">The alert you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/alerts"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Alerts
        </Link>
      </div>
    );
  }

  const getSeverityInfo = (severity: string) => {
    const severityMap = {
      critical: { color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-800' },
      high: { color: 'orange', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-800' },
      medium: { color: 'yellow', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-800' },
      low: { color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-800' }
    };
    return severityMap[severity as keyof typeof severityMap] || severityMap.low;
  };

  const severityInfo = getSeverityInfo(alert.severity);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/alerts"
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Alerts
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Alert Details</h1>
            <p className="text-gray-600 mt-1">Alert ID: {alert.id}</p>
          </div>
        </div>
        
        {!alert.is_resolved && (
          <button
            onClick={handleResolveAlert}
            disabled={resolveAlertMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {resolveAlertMutation.isPending ? 'Resolving...' : 'Resolve Alert'}
          </button>
        )}
      </div>

      {/* Alert Status Card */}
      <div className={`rounded-lg border-2 ${severityInfo.borderColor} ${severityInfo.bgColor} p-6`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className={`rounded-full p-3 bg-${severityInfo.color}-100`}>
              <AlertTriangle className={`h-6 w-6 text-${severityInfo.color}-600`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-xl font-semibold text-gray-900">{alert.alert_type}</h2>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full bg-${severityInfo.color}-100 text-${severityInfo.color}-800`}>
                  {alert.severity.toUpperCase()}
                </span>
                {alert.is_resolved && (
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                    RESOLVED
                  </span>
                )}
              </div>
              <p className="text-gray-700 text-lg mb-4">{alert.message}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>Pond: {alert.pond_name}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>User: {alert.resolved_by_username || 'System'}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Created: {formatDateTime(alert.created_at)}</span>
                </div>
                {alert.is_resolved && alert.resolved_at && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Resolved: {formatDateTime(alert.resolved_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Alert Type</dt>
                <dd className="text-sm text-gray-900">{alert.alert_type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Severity</dt>
                <dd className="text-sm text-gray-900 capitalize">{alert.severity}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm text-gray-900">
                  {alert.is_resolved ? 'Resolved' : 'Active'}
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Pond</dt>
                <dd className="text-sm text-gray-900">{alert.pond_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created By</dt>
                <dd className="text-sm text-gray-900">{alert.resolved_by_username || 'System'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="text-sm text-gray-900">{formatDateTime(alert.created_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Alert Message */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Message</h3>
        <div className="bg-gray-50 rounded-md p-4">
          <p className="text-gray-700 whitespace-pre-wrap">{alert.message}</p>
        </div>
      </div>

      {/* Actions - Commented out as actions property doesn't exist in Alert interface */}
      {/* {alert.actions && alert.actions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h3>
          <div className="space-y-2">
            {alert.actions.map((action: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-gray-700 capitalize">{action.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          {alert.pond && (
            <Link
              href={`/ponds/${alert.pond}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <MapPin className="h-4 w-4 mr-2" />
              View Pond
            </Link>
          )}
          <Link
            href="/alerts"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Alerts
          </Link>
        </div>
      </div>
    </div>
  );
}
