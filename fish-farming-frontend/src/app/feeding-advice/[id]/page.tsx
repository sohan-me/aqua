'use client';

import { useFeedingAdviceById, useDeleteFeedingAdvice, useApplyFeedingAdvice } from '@/hooks/useApi';
import { formatDate, formatWeight } from '@/lib/utils';
import { Lightbulb, ArrowLeft, Edit, Trash2, Calendar, User, CheckCircle, Clock, Thermometer, Droplets } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { use } from 'react';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function FeedingAdviceDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const adviceId = parseInt(resolvedParams.id);
  
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
                  {formatWeight(advice.data.average_fish_weight_kg)} kg
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-700 mb-2">Total Biomass</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {formatWeight(advice.data.total_biomass_kg)} kg
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
                  {formatWeight(advice.data.recommended_feed_kg)} kg/day
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
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Feed Amount Per Session</h3>
                <p className="text-lg font-semibold text-gray-900">
                  {(() => {
                    // @ts-expect-error TypeScript strict mode issue with parseFloat division
                    const feedPerSession = parseFloat(advice.data.recommended_feed_kg) / parseFloat(advice.data.feeding_frequency);
                    return formatWeight(feedPerSession.toString());
                  })()} kg per session
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatWeight(advice.data.recommended_feed_kg)} kg ÷ {advice.data.feeding_frequency} sessions
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
                    ৳{parseFloat(advice.data.daily_feed_cost).toFixed(4)}
                  </p>
                </div>
              )}
              
              {advice.data.feed_cost_per_kg && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Feed Cost per kg</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    ৳{parseFloat(advice.data.feed_cost_per_kg).toFixed(4)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scientific Feeding Information */}
        {advice.data.analysis_data?.feeding_recommendations && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">🧬 Scientific Feeding Analysis</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feeding Stage */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">📊 Scientific Feeding Stage</h3>
                <div className="space-y-1 text-sm text-blue-700">
                  <p>Stage: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.feeding_stage || 'Unknown'}</span></p>
                  <p>Pieces/kg: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.pcs_per_kg || 'N/A'}</span></p>
                  <p>Protein: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.protein_requirement || 'N/A'}%</span></p>
                  <p>Pellet Size: <span className="font-semibold text-xs">{advice.data.analysis_data.feeding_recommendations.pellet_size || 'N/A'}</span></p>
                  <p>Frequency: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.feeding_frequency || 'N/A'}x/day</span></p>
                  <p>Times: <span className="font-semibold text-xs">{advice.data.analysis_data.feeding_recommendations.feeding_times || 'N/A'}</span></p>
                  <p>Split: <span className="font-semibold text-xs">{advice.data.analysis_data.feeding_recommendations.feeding_split || 'N/A'}</span></p>
                </div>
              </div>

              {/* Daily Feeding Calculation */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-900 mb-2">🧮 Daily Feeding Formula</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p>Formula: <span className="font-semibold text-xs">(Fish × Weight(g) ÷ 1000) × (%BW/day ÷ 100)</span></p>
                  <p>Base %BW/day: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.base_rate || 0}%</span></p>
                  <p>Final %BW/day: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.final_rate || 0}%</span></p>
                  <p>Base Daily Feed: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.base_daily_feed_kg || 0} kg</span></p>
                  <p>Final Daily Feed: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.recommended_feed_kg || 0} kg</span></p>
                </div>
              </div>

              {/* Feeding Adjustments */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-orange-900 mb-2">⚖️ Feeding Adjustments</h3>
                <div className="space-y-1 text-sm text-orange-700">
                  <p>Water Quality: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.adjustments?.water_quality || 0 > 0 ? '+' : ''}{advice.data.analysis_data.feeding_recommendations.adjustments?.water_quality || 0}%</span></p>
                  <p>Temperature: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.adjustments?.temperature || 0 > 0 ? '+' : ''}{advice.data.analysis_data.feeding_recommendations.adjustments?.temperature || 0}%</span></p>
                  <p>Mortality: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.adjustments?.mortality || 0 > 0 ? '+' : ''}{advice.data.analysis_data.feeding_recommendations.adjustments?.mortality || 0}%</span></p>
                  <p>Growth: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.adjustments?.growth || 0 > 0 ? '+' : ''}{advice.data.analysis_data.feeding_recommendations.adjustments?.growth || 0}%</span></p>
                  <p>Seasonal: <span className="font-semibold">{advice.data.analysis_data.feeding_recommendations.adjustments?.seasonal || 0 > 0 ? '+' : ''}{advice.data.analysis_data.feeding_recommendations.adjustments?.seasonal || 0}%</span></p>
                  <p className="font-semibold text-orange-900">Total: {advice.data.analysis_data.feeding_recommendations.adjustments?.total_adjustment || 0 > 0 ? '+' : ''}{advice.data.analysis_data.feeding_recommendations.adjustments?.total_adjustment || 0}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comprehensive Analysis */}
        {advice.data.analysis_data && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Comprehensive Analysis</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Water Quality Analysis */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Water Quality</h3>
                <div className="space-y-1 text-sm text-blue-700">
                  <p>Status: <span className="font-semibold capitalize">{advice.data.analysis_data.water_quality_analysis?.quality_status || 'Unknown'}</span></p>
                  <p>Score: <span className="font-semibold">{advice.data.analysis_data.water_quality_analysis?.quality_score || 0}/100</span></p>
                  {advice.data.analysis_data.water_quality_analysis?.temperature && (
                    <p>Temp: <span className="font-semibold">{advice.data.analysis_data.water_quality_analysis.temperature}°C</span></p>
                  )}
                  {advice.data.analysis_data.water_quality_analysis?.ph && (
                    <p>pH: <span className="font-semibold">{advice.data.analysis_data.water_quality_analysis.ph}</span></p>
                  )}
                </div>
              </div>

              {/* Mortality Analysis */}
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-900 mb-2">Mortality Analysis</h3>
                <div className="space-y-1 text-sm text-red-700">
                  <p>Recent Deaths: <span className="font-semibold">{advice.data.analysis_data.mortality_analysis?.total_recent_deaths || 0}</span></p>
                  <p>Events: <span className="font-semibold">{advice.data.analysis_data.mortality_analysis?.mortality_events || 0}</span></p>
                  <p>Risk Factors: <span className="font-semibold">{advice.data.analysis_data.mortality_analysis?.risk_factors?.length || 0}</span></p>
                </div>
              </div>

              {/* Growth Analysis */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-900 mb-2">Growth Analysis</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p>Rate: <span className="font-semibold">{(advice.data.analysis_data.growth_analysis?.growth_rate_kg_per_day || 0).toFixed(4)} kg/day</span></p>
                  <p>Trend: <span className="font-semibold capitalize">{advice.data.analysis_data.growth_analysis?.growth_trend || 'Unknown'}</span></p>
                  <p>Quality: <span className="font-semibold capitalize">{advice.data.analysis_data.growth_analysis?.growth_quality || 'Unknown'}</span></p>
                </div>
              </div>

              {/* Feeding Pattern Analysis */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-900 mb-2">Feeding Patterns</h3>
                <div className="space-y-1 text-sm text-yellow-700">
                  <p>Avg Daily: <span className="font-semibold">{(advice.data.analysis_data.feeding_analysis?.avg_daily_feed || 0).toFixed(4)} kg</span></p>
                  <p>Consistency: <span className="font-semibold capitalize">{advice.data.analysis_data.feeding_analysis?.feeding_consistency || 'Unknown'}</span></p>
                  <p>Feed Types: <span className="font-semibold">{advice.data.analysis_data.feeding_analysis?.feed_types_used?.length || 0}</span></p>
                </div>
              </div>

              {/* Environmental Factors */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-900 mb-2">Environmental</h3>
                <div className="space-y-1 text-sm text-purple-700">
                  <p>Season: <span className="font-semibold capitalize">{advice.data.analysis_data.environmental_analysis?.season || 'Unknown'}</span></p>
                  <p>Temp Trend: <span className="font-semibold capitalize">{advice.data.analysis_data.environmental_analysis?.temperature_trend || 'Unknown'}</span></p>
                  <p>Factors: <span className="font-semibold">{advice.data.analysis_data.environmental_analysis?.seasonal_factors?.length || 0}</span></p>
                </div>
              </div>

              {/* Fish Population */}
              <div className="bg-indigo-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-indigo-900 mb-2">Fish Population</h3>
                <div className="space-y-1 text-sm text-indigo-700">
                  <p>Current Count: <span className="font-semibold">{advice.data.analysis_data.fish_count_analysis?.current_count?.toLocaleString() || 0}</span></p>
                  <p>Survival Rate: <span className="font-semibold">{(advice.data.analysis_data.fish_count_analysis?.survival_rate || 0).toFixed(1)}%</span></p>
                  <p>Mortality Trend: <span className="font-semibold capitalize">{advice.data.analysis_data.fish_count_analysis?.mortality_trend || 'Unknown'}</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {advice.data.notes && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis & Recommendations</h2>
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
