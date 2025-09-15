'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStockingById, useUpdateStocking, usePonds, useSpecies } from '@/hooks/useApi';
import { ArrowLeft, Save, X, Fish, Calculator, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function EditStockingPage() {
  const params = useParams();
  const router = useRouter();
  const stockingId = parseInt(params.id as string);
  
  const { data: stocking, isLoading: stockingLoading } = useStockingById(stockingId);
  const { data: pondsData } = usePonds();
  const { data: speciesData } = useSpecies();
  const updateStocking = useUpdateStocking();
  
  const ponds = pondsData?.data || [];
  const species = speciesData?.data || [];

  const [formData, setFormData] = useState({
    pond: '',
    species: '',
    date: '',
    pcs: '',
    total_weight_kg: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when stocking data loads
  useEffect(() => {
    if (stocking) {
      setFormData({
        pond: stocking.data.pond?.toString() || '',
        species: stocking.data.species?.toString() || '',
        date: stocking.data.date || '',
        pcs: stocking.data.pcs?.toString() || '',
        total_weight_kg: stocking.data.total_weight_kg?.toString() || '',
        notes: stocking.data.notes || ''
      });
    }
  }, [stocking]);

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
        species: parseInt(formData.species),
        date: formData.date,
        pcs: parseInt(formData.pcs),
        total_weight_kg: parseFloat(formData.total_weight_kg),
        notes: formData.notes
      };

      await updateStocking.mutateAsync({ id: stockingId, data: submitData });
      router.push('/stocking');
    } catch (error) {
      toast.error('Failed to update stocking record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/stocking');
  };

  if (stockingLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stocking) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Stocking Record Not Found</h2>
        <p className="text-gray-600 mb-6">The stocking record you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/stocking')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Stocking
        </button>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-900">Edit Stocking Record</h1>
            <p className="text-gray-600 mt-1">
              {stocking.data.species_name} in {stocking.data.pond_name}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stocking Information</h2>
          
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
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="species" className="block text-sm font-medium text-gray-700">
                  Species *
                </label>
                <Link
                  href="/species/new"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add New Species
                </Link>
              </div>
              <select
                id="species"
                name="species"
                required
                value={formData.species}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              >
                <option value="">Select a species</option>
                {species.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    {spec.name} ({spec.scientific_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Stocking Date *
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
              <label htmlFor="pcs" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Pieces *
              </label>
              <input
                type="number"
                id="pcs"
                name="pcs"
                required
                min="1"
                value={formData.pcs}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 1000"
              />
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
                placeholder="e.g., 2.5"
              />
            </div>

          </div>

          <div className="mt-6">
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
              placeholder="Additional notes about this stocking..."
            />
          </div>
        </div>

        {/* Calculation Preview */}
        {(formData.pcs && formData.total_weight_kg) && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Calculation Preview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Total Weight</p>
                <p className="text-2xl font-bold text-blue-900">
                  {parseFloat(formData.total_weight_kg).toFixed(4)} kg
                </p>
              </div>
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Pieces per kg</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(parseInt(formData.pcs) / parseFloat(formData.total_weight_kg)).toFixed(4)} pcs/kg
                </p>
              </div>
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Average Weight per Fish</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(parseFloat(formData.total_weight_kg) / parseInt(formData.pcs)).toFixed(4)} kg
                </p>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              * These values will be automatically calculated and saved
            </p>
          </div>
        )}

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
            {isSubmitting ? 'Updating...' : 'Update Stocking'}
          </button>
        </div>
      </form>
    </div>
  );
}
