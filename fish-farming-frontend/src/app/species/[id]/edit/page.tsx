'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSpeciesById, useUpdateSpecies } from '@/hooks/useApi';
import { ArrowLeft, Save, X, Fish } from 'lucide-react';
import { toast } from 'sonner';

interface EditSpeciesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditSpeciesPage({ params }: EditSpeciesPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { data: speciesData, isLoading } = useSpeciesById(parseInt(id));
  const updateSpecies = useUpdateSpecies();
  
  const species = speciesData?.data;

  const [formData, setFormData] = useState({
    name: '',
    scientific_name: '',
    description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when species data is loaded
  useEffect(() => {
    if (species) {
      setFormData({
        name: species.name || '',
        scientific_name: species.scientific_name || '',
        description: species.description || ''
      });
    }
  }, [species]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        name: formData.name.trim(),
        scientific_name: formData.scientific_name.trim(),
        description: formData.description.trim()
      };

      await updateSpecies.mutateAsync({ id: parseInt(id), data: submitData });
      router.push(`/species/${id}`);
    } catch (error) {
      toast.error('Failed to update species');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/species/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!species) {
    return (
      <div className="text-center py-12">
        <Fish className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Species not found</h3>
        <p className="mt-1 text-sm text-gray-500">The species you're trying to edit doesn't exist.</p>
        <div className="mt-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
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
            <h1 className="text-3xl font-bold text-gray-900">Edit Species</h1>
            <p className="text-gray-600 mt-1">Update species information</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Fish className="h-5 w-5 mr-2" />
            Species Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Common Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., Tilapia"
              />
            </div>

            <div>
              <label htmlFor="scientific_name" className="block text-sm font-medium text-gray-700 mb-2">
                Scientific Name *
              </label>
              <input
                type="text"
                id="scientific_name"
                name="scientific_name"
                required
                value={formData.scientific_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., Oreochromis niloticus"
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              placeholder="Brief description of the species..."
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
            {isSubmitting ? 'Updating...' : 'Update Species'}
          </button>
        </div>
      </form>
    </div>
  );
}
