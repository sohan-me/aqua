'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateStocking, usePonds, useSpecies } from '@/hooks/useApi';
import { extractApiData } from '@/lib/utils';
import { Pond, Species } from '@/lib/api';
import { ArrowLeft, Save, X, Fish, Calculator, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewStockingPage() {
  const router = useRouter();
  const createStocking = useCreateStocking();
  const { data: pondsData } = usePonds();
  const { data: speciesData } = useSpecies();
  
  const ponds = extractApiData<Pond>(pondsData?.data);
  const species = extractApiData<Species>(speciesData?.data);

  const [formData, setFormData] = useState({
    pond: '',
    species: '',
    date: new Date().toISOString().split('T')[0],
    pcs: '',
    total_weight_kg: '',
    pieces_per_kg: '',
    avg_weight_grams: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPiecesPerKgAutoCalculated, setIsPiecesPerKgAutoCalculated] = useState(false);

  // Auto-calculate pieces per kg and average weight in grams when pieces and total weight are provided
  useEffect(() => {
    if (formData.pcs && formData.total_weight_kg) {
      const pieces = parseFloat(formData.pcs);
      const totalWeight = parseFloat(formData.total_weight_kg);
      
      if (pieces > 0 && totalWeight > 0) {
        const calculatedPiecesPerKg = pieces / totalWeight;
        const calculatedAvgWeightGrams = (totalWeight / pieces) * 1000; // Convert kg to grams
        
        setFormData(prev => ({
          ...prev,
          pieces_per_kg: calculatedPiecesPerKg.toFixed(4),
          avg_weight_grams: calculatedAvgWeightGrams.toFixed(2)
        }));
        setIsPiecesPerKgAutoCalculated(true);
      }
    } else {
      setIsPiecesPerKgAutoCalculated(false);
    }
  }, [formData.pcs, formData.total_weight_kg]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // If user manually changes pieces_per_kg, disable auto-calculation
    if (name === 'pieces_per_kg') {
      setIsPiecesPerKgAutoCalculated(false);
    }
    
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
        pieces_per_kg: parseFloat(formData.pieces_per_kg),
        avg_weight_grams: parseFloat(formData.avg_weight_grams),
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                step="0.0001"
                value={formData.total_weight_kg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 2.5"
              />
              <p className="text-xs text-gray-500 mt-1">Total weight of all fish in kilograms</p>
            </div>

            <div>
              <label htmlFor="avg_weight_grams" className="block text-sm font-medium text-gray-700 mb-2">
                Average Weight per Fish (grams)
              </label>
              <input
                type="number"
                id="avg_weight_grams"
                name="avg_weight_grams"
                readOnly
                value={formData.avg_weight_grams}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Auto-calculated"
              />
              <p className="text-xs text-gray-500 mt-1">Automatically calculated from pieces and total weight</p>
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

        {/* Calculated Values Display */}
        {(formData.pcs && formData.total_weight_kg && formData.pieces_per_kg) && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Calculation Preview
              {isPiecesPerKgAutoCalculated && (
                <span className="ml-2 text-sm font-normal text-blue-600">(Auto-calculated)</span>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Total Weight</p>
                <p className="text-2xl font-bold text-blue-900">
                  {parseFloat(formData.total_weight_kg).toFixed(4)} kg
                </p>
              </div>
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Pieces per kg</p>
                <p className="text-xl font-bold text-blue-900">
                  {parseFloat(formData.pieces_per_kg).toFixed(4)} pcs/kg
                </p>
                {isPiecesPerKgAutoCalculated && (
                  <p className="text-xs text-blue-600 mt-1">Auto-calculated</p>
                )}
              </div>
              <div className="bg-white rounded-md p-4 border border-blue-200">
                <p className="text-sm font-medium text-blue-700">Average Weight per Fish</p>
                <p className="text-xl font-bold text-blue-900">
                  {(parseFloat(formData.total_weight_kg) / parseInt(formData.pcs)).toFixed(4)} kg
                </p>
              </div>
              
            </div>
            <p className="text-xs text-blue-600 mt-3">
              {isPiecesPerKgAutoCalculated 
                ? '* Pieces per kg is automatically calculated from pieces ÷ total weight'
                : '* These values will be saved as entered'
              }
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
            {isSubmitting ? 'Creating...' : 'Create Stocking'}
          </button>
        </div>
      </form>
    </div>
  );
}
