'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateMortality, usePonds, useSpecies } from '@/hooks/useApi';
import { extractApiData } from '@/lib/utils';
import { Pond, Species } from '@/lib/api';
import { ArrowLeft, Save, X, Fish, TrendingDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function NewMortalityPage() {
  const router = useRouter();
  const createMortality = useCreateMortality();
  const { data: pondsData } = usePonds();
  const { data: speciesData } = useSpecies();
  
  const ponds = extractApiData<Pond>(pondsData);
  const species = extractApiData<Species>(speciesData);

  const [formData, setFormData] = useState({
    pond: '',
    species: '',
    date: new Date().toISOString().split('T')[0],
    count: '',
    cause: '',
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
      const submitData = {
        pond: parseInt(formData.pond),
        species: formData.species ? parseInt(formData.species) : null,
        date: formData.date,
        count: parseInt(formData.count),
        cause: formData.cause || null,
        notes: formData.notes || ''
      };

      await createMortality.mutateAsync(submitData);
      router.push('/mortality');
    } catch (error) {
      console.error('Error creating mortality record:', error);
      toast.error('Failed to create mortality record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonCauses = [
    'Disease',
    'Poor Water Quality',
    'Oxygen Depletion',
    'Predation',
    'Stress',
    'Old Age',
    'Accident',
    'Unknown'
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mortality Tracking
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Add Mortality Record</h1>
          <p className="text-gray-600">Record fish mortality events and track causes</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Fish className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      {pond.name}
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
                  Date *
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
            </div>
          </div>

          {/* Mortality Details */}
          <div className="bg-red-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
              Mortality Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Dead Fish *
                </label>
                <input
                  type="number"
                  id="count"
                  name="count"
                  required
                  min="1"
                  value={formData.count}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="Enter number of dead fish"
                />
              </div>

            </div>
          </div>

          {/* Cause and Notes */}
          <div className="bg-orange-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Cause and Analysis
            </h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="cause" className="block text-sm font-medium text-gray-700 mb-2">
                  Cause of Mortality
                </label>
                <select
                  id="cause"
                  name="cause"
                  value={formData.cause}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                >
                  <option value="">Select a cause</option>
                  {commonCauses.map((cause) => (
                    <option key={cause} value={cause}>
                      {cause}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="Add any additional observations, symptoms, or details about the mortality event..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="h-4 w-4 mr-2 inline" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMortality.isPending}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2 inline" />
              {isSubmitting || createMortality.isPending ? 'Recording...' : 'Record Mortality'}
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Mortality Tracking Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Common Causes:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• Disease: Bacterial, viral, or parasitic infections</li>
              <li>• Poor Water Quality: High ammonia, low oxygen, pH issues</li>
              <li>• Oxygen Depletion: Equipment failure, overstocking</li>
              <li>• Stress: Handling, transport, environmental changes</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Best Practices:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• Record mortalities daily for accurate tracking</li>
              <li>• Note average weight to track growth patterns</li>
              <li>• Document symptoms and environmental conditions</li>
              <li>• Use this data to improve farm management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
