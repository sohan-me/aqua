'use client';

import { usePonds, useSpecies, useCreateFishSampling } from '@/hooks/useApi';
import { extractApiData } from '@/lib/utils';
import { Pond, Species } from '@/lib/api';
import { Scale, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function NewFishSamplingPage() {
  const router = useRouter();
  const { data: pondsData } = usePonds();
  const { data: speciesData } = useSpecies();
  const createSampling = useCreateFishSampling();
  const ponds = extractApiData<Pond>(pondsData?.data);
  const species = extractApiData<Species>(speciesData?.data);
  
  const [formData, setFormData] = useState({
    pond: '',
    species: '',
    date: new Date().toISOString().split('T')[0],
    sample_size: '',
    total_weight_kg: '',
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
      await createSampling.mutateAsync({
        pond: parseInt(formData.pond),
        species: formData.species ? parseInt(formData.species) : null,
        date: formData.date,
        sample_size: parseInt(formData.sample_size),
        total_weight_kg: parseFloat(formData.total_weight_kg),
        notes: formData.notes
      });
      
      toast.success('Fish sampling recorded successfully!');
      router.push('/fish-sampling');
    } catch (error) {
      toast.error('Failed to record fish sampling');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/fish-sampling"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Fish Sampling
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Record Fish Sampling</h1>
        <p className="text-gray-600">Record fish sampling data to monitor growth and health</p>
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
                  <option key={pond.pond_id} value={pond.pond_id}>
                    {pond.name} ({pond.water_area_decimal} decimal)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="species" className="block text-sm font-medium text-gray-700 mb-2">
                Species
              </label>
              <select
                id="species"
                name="species"
                value={formData.species}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              >
                <option value="">Select a species (optional)</option>
                {species.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name} ({spec.scientific_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Sampling Date *
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

            <div>
              <label htmlFor="sample_size" className="block text-sm font-medium text-gray-700 mb-2">
                Sample Size (Number of Fish) *
              </label>
              <input
                type="number"
                id="sample_size"
                name="sample_size"
                required
                min="1"
                value={formData.sample_size}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 10"
              />
              <p className="text-xs text-gray-500 mt-1">Number of fish sampled for measurement</p>
            </div>

            <div>
              <label htmlFor="total_weight_kg" className="block text-sm font-medium text-gray-700 mb-2">
                Total Weight (kg) *
              </label>
              <input
                type="number"
                id="total_weight_kg"
                name="total_weight_kg"
                required
                min="0"
                step="0.001"
                value={formData.total_weight_kg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 2.500"
              />
              <p className="text-xs text-gray-500 mt-1">Total weight of all sampled fish in kilograms</p>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="Observations, fish health, growth patterns, etc."
              />
            </div>
          </div>
        </div>

        {/* Calculated Metrics Preview */}
        {formData.sample_size && formData.total_weight_kg && !isNaN(parseInt(formData.sample_size)) && !isNaN(parseFloat(formData.total_weight_kg)) && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <Scale className="h-5 w-5 mr-2" />
              Calculated Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-700">Average Weight per Fish</p>
                <p className="text-xl font-semibold text-blue-900">
                  {(parseFloat(formData.total_weight_kg) / parseInt(formData.sample_size)).toFixed(3)} kg
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Fish per kg</p>
                <p className="text-xl font-semibold text-blue-900">
                  {(parseInt(formData.sample_size) / parseFloat(formData.total_weight_kg)).toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Condition Factor</p>
                <p className="text-xl font-semibold text-blue-900">
                  {((parseFloat(formData.total_weight_kg) / parseInt(formData.sample_size)) * 1000).toFixed(3)}
                </p>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              * These metrics will be automatically calculated and saved
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
            {isSubmitting ? 'Recording...' : 'Record Sampling'}
          </button>
        </div>
      </form>
    </div>
  );
}
