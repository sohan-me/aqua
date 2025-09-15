'use client';

import { useFeedingAdvice, useDeleteFeedingAdvice, useApplyFeedingAdvice, useGenerateFeedingAdvice, usePonds } from '@/hooks/useApi';
import { formatDate, formatWeight } from '@/lib/utils';
import { Lightbulb, Plus, Eye, Edit, Trash2, Calendar, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export default function FeedingAdvicePage() {
  const { data: adviceData, isLoading } = useFeedingAdvice();
  const { data: pondsData } = usePonds();
  const deleteAdvice = useDeleteFeedingAdvice();
  const applyAdvice = useApplyFeedingAdvice();
  const generateAdvice = useGenerateFeedingAdvice();
  const [filterPond, setFilterPond] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPondForGeneration, setSelectedPondForGeneration] = useState('');
  
  const advice = adviceData?.data || [];
  
  const filteredAdvice = advice.filter(item => {
    const pondMatch = filterPond === 'all' || item.pond.toString() === filterPond;
    const statusMatch = filterStatus === 'all' || 
      (filterStatus === 'applied' && item.is_applied) ||
      (filterStatus === 'pending' && !item.is_applied);
    return pondMatch && statusMatch;
  });

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this feeding advice?')) {
      try {
        await deleteAdvice.mutateAsync(id);
      } catch (error) {
        toast.error('Failed to delete feeding advice');
      }
    }
  };

  const handleApplyAdvice = async (id: number) => {
    try {
      await applyAdvice.mutateAsync(id);
    } catch (error) {
      toast.error('Failed to apply feeding advice');
    }
  };

  const handleGenerateAdvice = async () => {
    if (!selectedPondForGeneration) {
      toast.error('Please select a pond to generate feeding advice');
      return;
    }
    
    try {
      await generateAdvice.mutateAsync({ pond_id: parseInt(selectedPondForGeneration) });
      setSelectedPondForGeneration('');
    } catch (error) {
      // Error is handled by the hook
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feeding Advice</h1>
          <p className="text-gray-600">AI-powered feeding recommendations based on Google Sheets rules and fish growth data</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* One-Click Generation */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedPondForGeneration}
              onChange={(e) => setSelectedPondForGeneration(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            >
              <option value="">Select Pond *</option>
              {pondsData?.data?.map((pond: any) => (
                <option key={pond.id} value={pond.id}>
                  {pond.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerateAdvice}
              disabled={!selectedPondForGeneration || generateAdvice.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generateAdvice.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Lightbulb className="h-4 w-4 mr-2" />
              )}
              <span>One-Click Generate</span>
            </button>
          </div>
          
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <Lightbulb className="h-5 w-5 text-gray-400" />
          <select
            value={filterPond}
            onChange={(e) => setFilterPond(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Ponds</option>
            {Array.from(new Set(advice.map(a => a.pond_name))).map(pondName => (
              <option key={pondName} value={advice.find(a => a.pond_name === pondName)?.pond}>
                {pondName}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="applied">Applied</option>
          </select>
        </div>
      </div>

      {/* Advice Records */}
      {filteredAdvice.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No feeding advice records</h3>
          <p className="mt-1 text-sm text-gray-500">Generate AI-powered feeding recommendations for your ponds.</p>
          <div className="mt-6">
            <Link
              href="/feeding-advice/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Feeding Advice
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredAdvice.map((item) => (
            <div key={item.id} className={`bg-white rounded-lg shadow-sm border p-6 ${item.is_applied ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Lightbulb className={`h-5 w-5 ${item.is_applied ? 'text-green-600' : 'text-blue-600'}`} />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {item.pond_name}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      item.is_applied 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.is_applied ? 'APPLIED' : 'PENDING'}
                    </span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {item.season.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Fish Count</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {item.estimated_fish_count.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Biomass</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatWeight(item.total_biomass_kg)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Recommended Feed</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatWeight(item.recommended_feed_kg)} kg/day
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Feeding Rate</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {parseFloat(item.feeding_rate_percent).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Feed Per Session</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {(() => {
                          // @ts-expect-error TypeScript strict mode issue with parseFloat division
                          const feedPerSession = parseFloat(item.recommended_feed_kg) / parseFloat(item.feeding_frequency);
                          return formatWeight(feedPerSession.toString());
                        })()} kg
                      </p>
                    </div>
                  </div>
                  
                  {/* Enhanced Analysis Summary */}
                  {item.analysis_data && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Water Quality</p>
                          <p className="text-sm font-semibold text-gray-900 capitalize">
                            {item.analysis_data.water_quality_analysis?.quality_status || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Growth Quality</p>
                          <p className="text-sm font-semibold text-gray-900 capitalize">
                            {item.analysis_data.growth_analysis?.growth_quality || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Mortality Risk</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.analysis_data.mortality_analysis?.risk_factors?.length || 0} factors
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Feeding Consistency</p>
                          <p className="text-sm font-semibold text-gray-900 capitalize">
                            {item.analysis_data.feeding_analysis?.feeding_consistency || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Scientific Feeding Information */}
                      {item.analysis_data.feeding_recommendations && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500">Feeding Stage</p>
                            <p className="text-sm font-semibold text-blue-600">
                              {item.analysis_data.feeding_recommendations.feeding_stage || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">%BW/day</p>
                            <p className="text-sm font-semibold text-green-600">
                              {item.analysis_data.feeding_recommendations.final_rate || 0}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Protein</p>
                            <p className="text-sm font-semibold text-purple-600">
                              {item.analysis_data.feeding_recommendations.protein_requirement || 'N/A'}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Adjustment</p>
                            <p className="text-sm font-semibold text-orange-600">
                              {item.analysis_data.feeding_recommendations.adjustments?.total_adjustment || 0 > 0 ? '+' : ''}{item.analysis_data.feeding_recommendations.adjustments?.total_adjustment || 0}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{formatDate(item.date)}</span>
                    </div>
                    {item.water_temp_c && (
                      <span>Water Temp: {parseFloat(item.water_temp_c).toFixed(1)}°C</span>
                    )}
                    <span>Frequency: {item.feeding_frequency}x/day</span>
                  </div>
                  
                  {item.daily_feed_cost && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-600">
                        <strong>Daily Feed Cost:</strong> ৳{parseFloat(item.daily_feed_cost).toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {item.notes && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600">
                        <strong>Notes:</strong> {item.notes}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex space-x-2">
                  <Link
                    href={`/feeding-advice/${item.id}`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Link>
                  <Link
                    href={`/feeding-advice/${item.id}/edit`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Link>
                  {!item.is_applied && (
                    <button
                      onClick={() => handleApplyAdvice(item.id)}
                      disabled={applyAdvice.isPending}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span>Apply</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deleteAdvice.isPending}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
