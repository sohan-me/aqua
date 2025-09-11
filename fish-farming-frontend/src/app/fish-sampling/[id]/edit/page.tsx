'use client';

import { usePonds, useFishSamplingById, useUpdateFishSampling } from '@/hooks/useApi';
import { Scale, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface PageProps {
  params: {
    id: string;
  };
}

export default function EditFishSamplingPage({ params }: PageProps) {
  const router = useRouter();
  const samplingId = parseInt(params.id as string);
  
  const { data: pondsData } = usePonds();
  const { data: sampling, isLoading: samplingLoading } = useFishSamplingById(samplingId);
  const updateSampling = useUpdateFishSampling();
  const ponds = pondsData?.data || [];
  
  const [formData, setFormData] = useState({
    pond: '',
    date: '',
    sample_size: '',
    total_weight_kg: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when sampling data loads
  useEffect(() => {
    if (sampling) {
      setFormData({
        pond: sampling.data.pond.toString(),
        date: sampling.data.date,
        sample_size: sampling.data.sample_size.toString(),
        total_weight_kg: sampling.data.total_weight_kg,
        notes: sampling.data.notes || ''
      });
    }
  }, [sampling]);

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
      await updateSampling.mutateAsync({
        id: samplingId,
        data: {
          pond: parseInt(formData.pond),
          date: formData.date,
          sample_size: parseInt(formData.sample_size),
          total_weight_kg: parseFloat(formData.total_weight_kg),
          notes: formData.notes
        }
      });
      
      toast.success('Fish sampling updated successfully!');
      router.push(`/fish-sampling/${samplingId}`);
    } catch (error) {
      toast.error('Failed to update fish sampling');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (samplingLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!sampling) {
    return (
      <div className="text-center py-12">
        <Scale className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Fish sampling not found</h3>
        <p className="mt-1 text-sm text-gray-500">The fish sampling record you're trying to edit doesn't exist.</p>
        <div className="mt-6">
          <Link
            href="/fish-sampling"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Fish Sampling
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/fish-sampling/${samplingId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Fish Sampling Details
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Fish Sampling</h1>
        <p className="text-gray-600">Update fish sampling data</p>
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
                Notes
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
                  {((parseFloat(formData.total_weight_kg) * 1000) / parseInt(formData.sample_size)).toFixed(1)} g
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
                  {(((parseFloat(formData.total_weight_kg) * 1000) / parseInt(formData.sample_size)) / 100).toFixed(3)}
                </p>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              * These metrics will be automatically recalculated and updated
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
            {isSubmitting ? 'Updating...' : 'Update Sampling'}
          </button>
        </div>
      </form>
    </div>
  );
}
