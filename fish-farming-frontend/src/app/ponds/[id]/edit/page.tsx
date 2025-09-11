'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePond, useUpdatePond } from '@/hooks/useApi';
import { ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function EditPondPage() {
  const params = useParams();
  const router = useRouter();
  const pondId = parseInt(params.id as string);
  
  const { data: pond, isLoading: pondLoading } = usePond(pondId);
  const updatePond = useUpdatePond();
  
  const [formData, setFormData] = useState({
    name: '',
    area_decimal: '',
    depth_ft: '',
    location: '',
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when pond data loads
  useEffect(() => {
    if (pond) {
      setFormData({
        name: pond.data.name || '',
        area_decimal: pond.data.area_decimal?.toString() || '',
        depth_ft: pond.data.depth_ft?.toString() || '',
        location: pond.data.location || '',
        is_active: pond.data.is_active ?? true
      });
    }
  }, [pond]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updatePond.mutateAsync({
        id: pondId,
        data: {
          name: formData.name,
          area_decimal: parseFloat(formData.area_decimal),
          depth_ft: parseFloat(formData.depth_ft),
          location: formData.location,
          is_active: formData.is_active
        }
      });
      
      toast.success('Pond updated successfully!');
      router.push(`/ponds/${pondId}`);
    } catch (error) {
      toast.error('Failed to update pond');
      console.error('Error updating pond:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (pondLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pond) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Pond Not Found</h2>
        <p className="text-gray-600 mb-6">The pond you&apos;re trying to edit doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/ponds')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ponds
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Pond</h1>
        <p className="text-gray-600 mt-1">Update pond information</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Pond Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              placeholder="e.g., Main Pond, Nursery Pond"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              placeholder="e.g., North Field, Block A"
            />
          </div>

          <div>
            <label htmlFor="area_decimal" className="block text-sm font-medium text-gray-700 mb-2">
              Area (Decimal) *
            </label>
            <input
              type="number"
              id="area_decimal"
              name="area_decimal"
              required
              min="0"
              step="0.001"
              value={formData.area_decimal}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              placeholder="e.g., 2.500"
            />
            <p className="text-xs text-gray-500 mt-1">1 decimal = 40.46 m²</p>
          </div>

          <div>
            <label htmlFor="depth_ft" className="block text-sm font-medium text-gray-700 mb-2">
              Depth (ft) *
            </label>
            <input
              type="number"
              id="depth_ft"
              name="depth_ft"
              required
              min="0"
              step="0.01"
              value={formData.depth_ft}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              placeholder="e.g., 5.00"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Active pond</span>
          </label>
        </div>

        {/* Current Volume Display */}
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Calculated Volume</h3>
          <p className="text-lg font-semibold text-gray-900">
            {formData.area_decimal && formData.depth_ft && !isNaN(parseFloat(formData.area_decimal)) && !isNaN(parseFloat(formData.depth_ft))
              ? `${(parseFloat(formData.area_decimal) * 40.46 * parseFloat(formData.depth_ft) * 0.3048).toFixed(3)} m³`
              : 'Enter area and depth to calculate volume'
            }
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Volume is automatically calculated as: Area (decimal) × 40.46 × Depth (ft) × 0.3048
          </p>
        </div>

        <div className="flex justify-end space-x-3 mt-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <X className="h-4 w-4 mr-2 inline" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2 inline" />
                Update Pond
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
