'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateHarvest, usePonds, useSpecies } from '@/hooks/useApi';
import { extractApiData } from '@/lib/utils';
import { Pond, Species } from '@/lib/api';
import { ArrowLeft, Save, X, Fish, Scale, DollarSign, Calculator } from 'lucide-react';
import { toast } from 'sonner';

export default function NewHarvestPage() {
  const router = useRouter();
  const createHarvest = useCreateHarvest();
  const { data: pondsData } = usePonds();
  const { data: speciesData } = useSpecies();
  
  const ponds = extractApiData<Pond>(pondsData);
  const species = extractApiData<Species>(speciesData);

  const [formData, setFormData] = useState({
    pond: '',
    species: '',
    date: new Date().toISOString().split('T')[0],
    total_weight_kg: '',
    pieces_per_kg: '',
    price_per_kg: '',
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
        total_weight_kg: parseFloat(formData.total_weight_kg),
        pieces_per_kg: formData.pieces_per_kg ? parseFloat(formData.pieces_per_kg) : null,
        price_per_kg: formData.price_per_kg ? parseFloat(formData.price_per_kg) : null,
        notes: formData.notes
      };

      await createHarvest.mutateAsync(submitData);
      router.push('/harvest');
    } catch (error) {
      toast.error('Failed to create harvest record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/harvest');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add Harvest Record</h1>
            <p className="text-gray-600 mt-1">Record harvest activities and revenue</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
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
                    {pond.name} ({pond.area_decimal} decimal)
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
                Harvest Date *
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

        {/* Harvest Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Fish className="h-5 w-5 mr-2 text-blue-600" />
            Harvest Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="total_weight_kg" className="block text-sm font-medium text-gray-700 mb-2">
                Total Weight (kg) *
              </label>
              <input
                type="number"
                id="total_weight_kg"
                name="total_weight_kg"
                required
                min="0.01"
                step="0.01"
                value={formData.total_weight_kg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 150.5"
              />
            </div>

            <div>
              <label htmlFor="pieces_per_kg" className="block text-sm font-medium text-gray-700 mb-2">
                Pieces per kg *
              </label>
              <input
                type="number"
                id="pieces_per_kg"
                name="pieces_per_kg"
                required
                min="0"
                step="0.01"
                value={formData.pieces_per_kg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 2.5"
              />
              <p className="text-xs text-gray-500 mt-1">Number of fish pieces per kilogram</p>
            </div>

            <div>
              <label htmlFor="price_per_kg" className="block text-sm font-medium text-gray-700 mb-2">
                Price per kg (৳)
              </label>
              <input
                type="number"
                id="price_per_kg"
                name="price_per_kg"
                min="0"
                step="0.01"
                value={formData.price_per_kg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 8.50"
              />
            </div>
          </div>
        </div>

        {/* Calculated Values Display */}
        {(formData.total_weight_kg && formData.pieces_per_kg) && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Calculated Values
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Average Weight per Fish (kg)</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(1 / parseFloat(formData.pieces_per_kg)).toFixed(3)} kg
                </p>
              </div>
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Total Fish Count</p>
                <p className="text-2xl font-bold text-blue-900">
                  {Math.round(parseFloat(formData.total_weight_kg) * parseFloat(formData.pieces_per_kg))} fish
                </p>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              * These values will be automatically calculated and saved
            </p>
          </div>
        )}

        {/* Revenue Calculation */}
        {formData.price_per_kg && formData.total_weight_kg && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Revenue Calculation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-green-700">Total Weight</p>
                <p className="text-2xl font-bold text-green-900">{formData.total_weight_kg} kg</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-green-700">Price per kg</p>
                <p className="text-2xl font-bold text-green-900">৳{parseFloat(formData.price_per_kg).toFixed(4)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-green-700">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900">
                  ৳{(parseFloat(formData.total_weight_kg) * parseFloat(formData.price_per_kg)).toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              placeholder="Record any observations, market conditions, or additional information..."
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: 'white !important' }}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Harvest Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
