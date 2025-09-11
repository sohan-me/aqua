'use client';

import { usePonds, useFeedTypes, useCreateFeedingAdvice } from '@/hooks/useApi';
import { Lightbulb, ArrowLeft, Calculator } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function NewFeedingAdvicePage() {
  const router = useRouter();
  const { data: pondsData } = usePonds();
  const { data: feedTypesData } = useFeedTypes();
  const createAdvice = useCreateFeedingAdvice();
  const ponds = pondsData?.data || [];
  const feedTypes = feedTypesData?.data || [];
  
  const [formData, setFormData] = useState({
    pond: '',
    date: new Date().toISOString().split('T')[0],
    estimated_fish_count: '',
    average_fish_weight_g: '',
    water_temp_c: '',
    season: 'summer',
    feed_type: '',
    feed_cost_per_kg: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createAdvice.mutateAsync({
        pond: parseInt(formData.pond),
        date: formData.date,
        estimated_fish_count: parseInt(formData.estimated_fish_count),
        average_fish_weight_g: parseFloat(formData.average_fish_weight_g),
        water_temp_c: formData.water_temp_c ? parseFloat(formData.water_temp_c) : null,
        season: formData.season,
        feed_type: formData.feed_type ? parseInt(formData.feed_type) : null,
        feed_cost_per_kg: formData.feed_cost_per_kg ? parseFloat(formData.feed_cost_per_kg) : null,
        notes: formData.notes
      });
      
      toast.success('Feeding advice generated successfully!');
      router.push('/feeding-advice');
    } catch (error) {
      toast.error('Failed to generate feeding advice');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate preview metrics
  const calculatePreview = () => {
    if (!formData.estimated_fish_count || !formData.average_fish_weight_g) return null;
    
    const fishCount = parseInt(formData.estimated_fish_count);
    const avgWeight = parseFloat(formData.average_fish_weight_g);
    const totalBiomass = (fishCount * avgWeight) / 1000; // Convert to kg
    
    // Base feeding rate (3% of biomass)
    let feedingRate = 3.0;
    
    // Temperature adjustment
    if (formData.water_temp_c) {
      const temp = parseFloat(formData.water_temp_c);
      if (temp < 15) feedingRate *= 0.5;
      else if (temp > 30) feedingRate *= 0.8;
    }
    
    // Season adjustment
    if (formData.season === 'winter') feedingRate *= 0.6;
    else if (formData.season === 'summer') feedingRate *= 1.2;
    
    const recommendedFeed = (totalBiomass * feedingRate) / 100;
    const dailyCost = formData.feed_cost_per_kg ? recommendedFeed * parseFloat(formData.feed_cost_per_kg) : null;
    
    return {
      totalBiomass,
      feedingRate,
      recommendedFeed,
      dailyCost
    };
  };

  const preview = calculatePreview();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/feeding-advice"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Feeding Advice
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Generate Feeding Advice</h1>
        <p className="text-gray-600">Create AI-powered feeding recommendations based on fish data and conditions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="pond" className="block text-sm font-medium text-gray-700 mb-2">
                Pond *
              </label>
              <select
                id="pond"
                name="pond"
                required
                value={formData.pond}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              >
                <option value="">Select a pond</option>
                {ponds.map((pond) => (
                  <option key={pond.id} value={pond.id}>
                    {pond.name} ({pond.area_decimal} decimal)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Advice Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                required
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="estimated_fish_count" className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Fish Count *
                </label>
                <input
                  type="number"
                  id="estimated_fish_count"
                  name="estimated_fish_count"
                  required
                  min="1"
                  value={formData.estimated_fish_count}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="e.g., 1000"
                />
              </div>

              <div>
                <label htmlFor="average_fish_weight_g" className="block text-sm font-medium text-gray-700 mb-2">
                  Average Fish Weight (g) *
                </label>
                <input
                  type="number"
                  id="average_fish_weight_g"
                  name="average_fish_weight_g"
                  required
                  min="0"
                  step="0.1"
                  value={formData.average_fish_weight_g}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="e.g., 200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="water_temp_c" className="block text-sm font-medium text-gray-700 mb-2">
                  Water Temperature (°C)
                </label>
                <input
                  type="number"
                  id="water_temp_c"
                  name="water_temp_c"
                  min="0"
                  max="40"
                  step="0.1"
                  value={formData.water_temp_c}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="e.g., 25.5"
                />
                <p className="text-xs text-gray-500 mt-1">Affects feeding rate calculation</p>
              </div>

              <div>
                <label htmlFor="season" className="block text-sm font-medium text-gray-700 mb-2">
                  Season *
                </label>
                <select
                  id="season"
                  name="season"
                  required
                  value={formData.season}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                >
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                  <option value="autumn">Autumn</option>
                  <option value="winter">Winter</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="feed_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Recommended Feed Type
                </label>
                <select
                  id="feed_type"
                  name="feed_type"
                  value={formData.feed_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                >
                  <option value="">Select feed type</option>
                  {feedTypes.map((feedType) => (
                    <option key={feedType.id} value={feedType.id}>
                      {feedType.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="feed_cost_per_kg" className="block text-sm font-medium text-gray-700 mb-2">
                  Feed Cost per kg ($)
                </label>
                <input
                  type="number"
                  id="feed_cost_per_kg"
                  name="feed_cost_per_kg"
                  min="0"
                  step="0.01"
                  value={formData.feed_cost_per_kg}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="e.g., 2.50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="Additional observations, feeding schedule preferences, etc."
              />
            </div>
          </div>
        </div>

        {/* Preview Calculations */}
        {preview && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Feeding Recommendations Preview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-700">Total Biomass</p>
                <p className="text-xl font-semibold text-blue-900">
                  {preview.totalBiomass.toFixed(1)} kg
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Feeding Rate</p>
                <p className="text-xl font-semibold text-blue-900">
                  {preview.feedingRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Recommended Feed</p>
                <p className="text-xl font-semibold text-blue-900">
                  {preview.recommendedFeed.toFixed(2)} kg/day
                </p>
              </div>
            </div>
            {preview.dailyCost && (
              <div className="mt-4">
                <p className="text-sm text-blue-700">Daily Feed Cost</p>
                <p className="text-xl font-semibold text-blue-900">
                  ${preview.dailyCost.toFixed(2)}
                </p>
              </div>
            )}
            <p className="text-xs text-blue-600 mt-3">
              * These recommendations will be automatically calculated and saved
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Generating...' : 'Generate Advice'}
          </button>
        </div>
      </form>
    </div>
  );
}
