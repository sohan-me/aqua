'use client';

import { usePonds, useAutoGenerateFeedingAdvice } from '@/hooks/useApi';
import { Lightbulb, ArrowLeft, Zap, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function NewFeedingAdvicePage() {
  const router = useRouter();
  const { data: pondsData } = usePonds();
  const autoGenerateAdvice = useAutoGenerateFeedingAdvice();
  const ponds = pondsData?.data || [];
  
  const [selectedPond, setSelectedPond] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPond) {
      toast.error('Please select a pond');
      return;
    }

    setIsGenerating(true);

    // Debug logging
    console.log('Frontend Debug - Selected Pond:', selectedPond);
    console.log('Frontend Debug - Parsed Pond ID:', parseInt(selectedPond));
    console.log('Frontend Debug - Request payload:', { pond: parseInt(selectedPond) });

    try {
      const result = await autoGenerateAdvice.mutateAsync({
        pond: parseInt(selectedPond)
      });
      
      console.log('Frontend Debug - Success result:', result);
      router.push('/feeding-advice');
    } catch (error) {
      // Error is handled by the hook with detailed messages
      console.error('Frontend Debug - Error details:', error);
      console.error('Feeding advice generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Auto-Generate Feeding Advice</h1>
        <p className="text-gray-600">AI-powered feeding recommendations based on your pond data</p>
      </div>

      {/* Information Card */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-2">How it works</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Automatically pulls fish sampling data for current biomass</li>
              <li>• Analyzes environmental conditions from daily logs</li>
              <li>• Considers seasonal factors and water temperature</li>
              <li>• Calculates optimal feeding rates for each species</li>
              <li>• Generates cost estimates based on feed types</li>
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="pond" className="block text-sm font-medium text-gray-700 mb-2">
                Select Pond *
              </label>
              <select
                id="pond"
                name="pond"
                required
                value={selectedPond}
                onChange={(e) => setSelectedPond(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              >
                <option value="">Choose a pond to generate advice for</option>
                {ponds.map((pond) => (
                  <option key={pond.id} value={pond.id}>
                    {pond.name} ({pond.area_decimal} decimal)
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Feeding advice will be generated for all species in this pond
              </p>
            </div>
          </div>
        </div>

        {/* Requirements Card */}
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
          <h3 className="text-sm font-medium text-yellow-900 mb-2">Requirements</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Pond must have stocking data</li>
            <li>• At least one fish sampling record is required for each species</li>
            <li>• Species must be defined in the system</li>
            <li>• Water quality data (optional but recommended)</li>
            <li>• Feeding records (optional but improves recommendations)</li>
          </ul>
        </div>

        {/* Data Status Card */}
        {selectedPond && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Data Status for Selected Pond</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• The system will check all species in this pond</p>
              <p>• Only species with fish sampling data will get feeding advice</p>
              <p>• Species without sampling data will be listed in the error message</p>
              <p>• You can add fish sampling data later and regenerate advice</p>
            </div>
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
            disabled={isGenerating || !selectedPond}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            {isGenerating ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4 mr-2" />
                Generate Advice
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
