'use client';

import { useState } from 'react';
import { usePonds, useSpecies } from '@/hooks/useApi';
import { Pond, Species } from '@/lib/api';
import { extractApiData } from '@/lib/utils';
import { 
  Target, 
  Calculator, 
  Calendar, 
  Package,
  TrendingUp,
  Clock,
  Scale,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface TargetBiomassForm {
  pondId: string;
  speciesId: string;
  targetBiomass: number;
  currentDate: string;
}

interface TargetBiomassResult {
  current_biomass_kg: number;
  target_biomass_kg: number;
  biomass_gap_kg: number;
  estimated_days: number;
  estimated_feed_kg: number;
  daily_feed_kg: number;
  growth_rate_kg_per_day: number;
  feed_conversion_ratio: number;
  target_date: string;
  recommendations: string[];
  warnings: string[];
}

export default function TargetBiomassPage() {
  const { data: pondsData } = usePonds();
  const { data: speciesData } = useSpecies();
  
  const ponds = extractApiData<Pond>(pondsData?.data);
  const species = extractApiData<Species>(speciesData?.data);
  
  const [form, setForm] = useState<TargetBiomassForm>({
    pondId: '',
    speciesId: '',
    targetBiomass: 0,
    currentDate: new Date().toISOString().split('T')[0],
  });
  
  const [result, setResult] = useState<TargetBiomassResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calculateTargetBiomass = async () => {
    if (!form.pondId || !form.speciesId || form.targetBiomass <= 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/fish-farming/target-biomass/calculate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          pond_id: parseInt(form.pondId),
          species_id: parseInt(form.speciesId),
          target_biomass_kg: form.targetBiomass,
          current_date: form.currentDate,
        }),
      });
      console.log(response);
      if (response.ok) {
        const data = await response.json();
        setResult(data);
        toast.success('Target biomass calculation completed');
      } else {
        const errorData = await response.json();
        console.log(errorData);
        toast.error(errorData.error || 'Failed to calculate target biomass');
      }
    } catch (error) {
      toast.error('Error calculating target biomass');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (key: keyof TargetBiomassForm, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm({
      pondId: '',
      speciesId: '',
      targetBiomass: 0,
      currentDate: new Date().toISOString().split('T')[0],
    });
    setResult(null);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Target className="h-8 w-8 mr-3 text-blue-600" />
            Target Biomass Calculator
          </h1>
          <p className="text-gray-600">Calculate feeding requirements and timeline to reach your target biomass</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-blue-600" />
            Input Parameters
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pond *</label>
              <select
                value={form.pondId}
                onChange={(e) => handleFormChange('pondId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a pond</option>
                {ponds.map((pond) => (
                  <option key={pond.pond_id} value={pond.pond_id.toString()}>
                    {pond.name} ({pond.water_area_decimal} decimal)
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Species *</label>
              <select
                value={form.speciesId}
                onChange={(e) => handleFormChange('speciesId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a species</option>
                {species.map((spec) => (
                  <option key={spec.id} value={spec.id.toString()}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>
            
            {form.pondId && form.speciesId && result && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Biomass (kg)</label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
                  {result.current_biomass_kg.toFixed(1)} kg
                </div>
                <p className="text-xs text-gray-500 mt-1">Automatically calculated from latest fish sampling data</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Biomass (kg) *</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.targetBiomass}
                onChange={(e) => handleFormChange('targetBiomass', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter target total biomass"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Date</label>
              <input
                type="date"
                value={form.currentDate}
                onChange={(e) => handleFormChange('currentDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                onClick={calculateTargetBiomass}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate
                  </>
                )}
              </button>
              
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Scale className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500">Biomass Gap</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {result.biomass_gap_kg.toFixed(1)} kg
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500">Estimated Days</h3>
                      <p className="text-2xl font-bold text-green-600">
                        {result.estimated_days} days
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Package className="h-8 w-8 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500">Total Feed Required</h3>
                      <p className="text-2xl font-bold text-orange-600">
                        {result.estimated_feed_kg.toFixed(1)} kg
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-gray-500">Daily Feed</h3>
                      <p className="text-2xl font-bold text-purple-600">
                        {result.daily_feed_kg.toFixed(4)} kg/day
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Current Biomass</label>
                      <p className="text-lg font-semibold text-gray-900">{result.current_biomass_kg.toFixed(1)} kg</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Target Biomass</label>
                      <p className="text-lg font-semibold text-gray-900">{result.target_biomass_kg.toFixed(1)} kg</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Growth Rate</label>
                      <p className="text-lg font-semibold text-gray-900">{result.growth_rate_kg_per_day.toFixed(3)} kg/day</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Feed Conversion Ratio</label>
                      <p className="text-lg font-semibold text-gray-900">{result.feed_conversion_ratio.toFixed(4)}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-gray-500">Target Date</label>
                    <p className="text-lg font-semibold text-gray-900 flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                      {new Date(result.target_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    Recommendations
                  </h2>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                    Warnings
                  </h2>
                  <ul className="space-y-2">
                    {result.warnings.map((warning, index) => (
                      <li key={index} className="flex items-start">
                        <AlertCircle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <Target className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No calculation results</h3>
              <p className="mt-1 text-sm text-gray-500">Fill in the form and click calculate to see your target biomass analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
