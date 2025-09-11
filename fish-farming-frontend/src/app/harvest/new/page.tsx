'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateHarvest, usePonds } from '@/hooks/useApi';
import { ArrowLeft, Save, X, Fish, Scale, DollarSign, Calculator } from 'lucide-react';
import { toast } from 'sonner';

export default function NewHarvestPage() {
  const router = useRouter();
  const createHarvest = useCreateHarvest();
  const { data: pondsData } = usePonds();
  
  const ponds = pondsData?.data || [];

  const [formData, setFormData] = useState({
    pond: '',
    date: new Date().toISOString().split('T')[0],
    total_weight_kg: '',
    total_count: '',
    avg_weight_g: '',
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

    // Auto-calculate average weight if both weight and count are provided
    if (name === 'total_weight_kg' || name === 'total_count') {
      const weight = name === 'total_weight_kg' ? parseFloat(value) : parseFloat(formData.total_weight_kg);
      const count = name === 'total_count' ? parseInt(value) : parseInt(formData.total_count);
      
      if (weight && count && count > 0) {
        const avgWeight = (weight * 1000) / count; // Convert kg to grams
        setFormData(prev => ({
          ...prev,
          avg_weight_g: avgWeight.toFixed(2)
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        pond: parseInt(formData.pond),
        date: formData.date,
        total_weight_kg: parseFloat(formData.total_weight_kg),
        total_count: parseInt(formData.total_count),
        avg_weight_g: formData.avg_weight_g ? parseFloat(formData.avg_weight_g) : null,
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
              <label htmlFor="total_count" className="block text-sm font-medium text-gray-700 mb-2">
                Total Fish Count *
              </label>
              <input
                type="number"
                id="total_count"
                name="total_count"
                required
                min="1"
                value={formData.total_count}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 500"
              />
            </div>

            <div>
              <label htmlFor="avg_weight_g" className="block text-sm font-medium text-gray-700 mb-2">
                Average Weight (g)
              </label>
              <input
                type="number"
                id="avg_weight_g"
                name="avg_weight_g"
                min="0"
                step="0.01"
                value={formData.avg_weight_g}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="Auto-calculated"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Automatically calculated from total weight and count</p>
            </div>

            <div>
              <label htmlFor="price_per_kg" className="block text-sm font-medium text-gray-700 mb-2">
                Price per kg ($)
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
                <p className="text-2xl font-bold text-green-900">৳{formData.price_per_kg}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-green-700">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900">
                  ৳{(parseFloat(formData.total_weight_kg) * parseFloat(formData.price_per_kg)).toFixed(2)}
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
              Notes
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
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Harvest Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
