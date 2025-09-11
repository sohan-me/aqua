'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateStocking, usePonds, useSpecies } from '@/hooks/useApi';
import { ArrowLeft, Save, X, Fish, Calculator, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewStockingPage() {
  const router = useRouter();
  const createStocking = useCreateStocking();
  const { data: pondsData } = usePonds();
  const { data: speciesData } = useSpecies();
  
  const ponds = pondsData?.data || [];
  const species = speciesData?.data || [];

  const [formData, setFormData] = useState({
    pond: '',
    species: '',
    date: new Date().toISOString().split('T')[0],
    pcs: '',
    total_weight_kg: '',
    line_pcs_per_kg: '',
    initial_avg_g: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-calculate initial_avg_g when total_weight_kg and pcs change
    if (name === 'total_weight_kg' || name === 'pcs') {
      const weight = parseFloat(name === 'total_weight_kg' ? value : formData.total_weight_kg);
      const pieces = parseFloat(name === 'pcs' ? value : formData.pcs);
      
      if (weight && pieces && pieces > 0) {
        const avgWeight = (weight * 1000) / pieces; // Convert kg to g
        setFormData(prev => ({
          ...prev,
          initial_avg_g: avgWeight.toFixed(3)
        }));
      }
    }

    // Auto-calculate line_pcs_per_kg when pcs and total_weight_kg change
    if (name === 'pcs' || name === 'total_weight_kg') {
      const pieces = parseFloat(name === 'pcs' ? value : formData.pcs);
      const weight = parseFloat(name === 'total_weight_kg' ? value : formData.total_weight_kg);
      
      if (pieces && weight && weight > 0) {
        const pcsPerKg = pieces / weight;
        setFormData(prev => ({
          ...prev,
          line_pcs_per_kg: pcsPerKg.toFixed(2)
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
        species: parseInt(formData.species),
        date: formData.date,
        pcs: parseInt(formData.pcs),
        total_weight_kg: parseFloat(formData.total_weight_kg),
        line_pcs_per_kg: formData.line_pcs_per_kg,
        initial_avg_g: formData.initial_avg_g,
        notes: formData.notes
      };

      await createStocking.mutateAsync(submitData);
      router.push('/stocking');
    } catch (error) {
      toast.error('Failed to create stocking record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/stocking');
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
            <h1 className="text-3xl font-bold text-gray-900">Add New Stocking</h1>
            <p className="text-gray-600 mt-1">Record a new fish stocking activity</p>
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

            <div>
              <label htmlFor="line_pcs_per_kg" className="block text-sm font-medium text-gray-700 mb-2">
                Pieces per kg
              </label>
              <input
                type="number"
                id="line_pcs_per_kg"
                name="line_pcs_per_kg"
                min="0"
                step="0.01"
                value={formData.line_pcs_per_kg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="Auto-calculated"
                readOnly
              />
            </div>

            <div>
              <label htmlFor="initial_avg_g" className="block text-sm font-medium text-gray-700 mb-2">
                Initial Average Weight (g)
              </label>
              <input
                type="number"
                id="initial_avg_g"
                name="initial_avg_g"
                min="0"
                step="0.001"
                value={formData.initial_avg_g}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="Auto-calculated"
                readOnly
              />
            </div>
          </div>

          <div className="mt-6">
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
              placeholder="Additional notes about this stocking..."
            />
          </div>
        </div>

        {/* Calculated Values Display */}
        {(formData.pcs && formData.total_weight_kg) && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Calculated Values
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Average Weight per Fish</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formData.initial_avg_g ? `${formData.initial_avg_g} g` : 'N/A'}
                </p>
              </div>
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Pieces per Kilogram</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formData.line_pcs_per_kg ? `${formData.line_pcs_per_kg} pcs/kg` : 'N/A'}
                </p>
              </div>
            </div>
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
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Stocking'}
          </button>
        </div>
      </form>
    </div>
  );
}
