'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreatePond } from '@/hooks/useApi';
import { ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function NewPondPage() {
  const router = useRouter();
  const createPond = useCreatePond();
  const [formData, setFormData] = useState({
    name: '',
    water_area_decimal: '',
    depth_ft: '',
    location: '',
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createPond.mutateAsync({
        name: formData.name,
        water_area_decimal: parseFloat(formData.water_area_decimal),
        depth_ft: parseFloat(formData.depth_ft),
        location: formData.location,
        is_active: formData.is_active
      });
      
      toast.success('Pond created successfully!');
      router.push('/ponds');
    } catch (error) {
      toast.error('Failed to create pond');
      console.error('Error creating pond:', error);
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
        <h1 className="text-2xl font-bold text-gray-900">Create New Pond</h1>
        <p className="text-gray-600 mt-1">Add a new pond to your fish farming system</p>
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
            <label htmlFor="water_area_decimal" className="block text-sm font-medium text-gray-700 mb-2">
              Area (Decimal) *
            </label>
            <input
              type="number"
              id="water_area_decimal"
              name="water_area_decimal"
              required
              min="0"
              step="0.001"
              value={formData.water_area_decimal}
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
                Creating...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2 inline" />
                Create Pond
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
