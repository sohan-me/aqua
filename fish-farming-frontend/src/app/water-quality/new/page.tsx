'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateSampling, usePonds, useSampleTypes } from '@/hooks/useApi';
import { extractApiData } from '@/lib/utils';
import { Pond, SampleType } from '@/lib/api';
import { ArrowLeft, Save, X, Droplets, Thermometer, TestTube, Fish } from 'lucide-react';
import { toast } from 'sonner';

export default function NewWaterQualityPage() {
  const router = useRouter();
  const createSampling = useCreateSampling();
  const { data: pondsData } = usePonds();
  const { data: sampleTypesData } = useSampleTypes();
  
  const ponds = extractApiData<Pond>(pondsData);
  const sampleTypes = extractApiData<SampleType>(sampleTypesData);

  const [formData, setFormData] = useState({
    pond: '',
    date: new Date().toISOString().split('T')[0],
    sample_type: sampleTypes.length > 0 ? sampleTypes[0].id.toString() : '',
    ph: '',
    temperature_c: '',
    dissolved_oxygen: '',
    ammonia: '',
    nitrite: '',
    nitrate: '',
    alkalinity: '',
    hardness: '',
    turbidity: '',
    fish_weight_kg: '',
    fish_length_ft: '',
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
        date: formData.date,
        sample_type: formData.sample_type,
        ph: formData.ph ? parseFloat(formData.ph) : null,
        temperature_c: formData.temperature_c ? parseFloat(formData.temperature_c) : null,
        dissolved_oxygen: formData.dissolved_oxygen ? parseFloat(formData.dissolved_oxygen) : null,
        ammonia: formData.ammonia ? parseFloat(formData.ammonia) : null,
        nitrite: formData.nitrite ? parseFloat(formData.nitrite) : null,
        nitrate: formData.nitrate ? parseFloat(formData.nitrate) : null,
        alkalinity: formData.alkalinity ? parseFloat(formData.alkalinity) : null,
        hardness: formData.hardness ? parseFloat(formData.hardness) : null,
        turbidity: formData.turbidity ? parseFloat(formData.turbidity) : null,
        fish_weight_g: formData.fish_weight_kg ? parseFloat(formData.fish_weight_kg) * 1000 : null,
        fish_length_cm: formData.fish_length_ft ? parseFloat(formData.fish_length_ft) * 30.48 : null,
        notes: formData.notes
      };

      await createSampling.mutateAsync(submitData);
      router.push('/water-quality');
    } catch (error) {
      toast.error('Failed to create water quality sample');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/water-quality');
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
            <h1 className="text-3xl font-bold text-gray-900">Add Water Quality Sample</h1>
            <p className="text-gray-600 mt-1">Record water quality parameters and sampling data</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            <div>
              <label htmlFor="sample_type" className="block text-sm font-medium text-gray-700 mb-2">
                Sample Type *
              </label>
              <select
                id="sample_type"
                name="sample_type"
                required
                value={formData.sample_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              >
                {sampleTypes.map((sampleType) => (
                  <option key={sampleType.id} value={sampleType.id}>
                    {sampleType.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Water Quality Parameters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Droplets className="h-5 w-5 mr-2 text-blue-600" />
            Water Quality Parameters
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label htmlFor="ph" className="block text-sm font-medium text-gray-700 mb-2">
                pH Level
              </label>
              <input
                type="number"
                id="ph"
                name="ph"
                min="0"
                max="14"
                step="0.1"
                value={formData.ph}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 7.2"
              />
            </div>

            <div>
              <label htmlFor="temperature_c" className="block text-sm font-medium text-gray-700 mb-2">
                Temperature (°C)
              </label>
              <input
                type="number"
                id="temperature_c"
                name="temperature_c"
                min="0"
                max="50"
                step="0.1"
                value={formData.temperature_c}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 25.5"
              />
            </div>

            <div>
              <label htmlFor="dissolved_oxygen" className="block text-sm font-medium text-gray-700 mb-2">
                Dissolved Oxygen (mg/L)
              </label>
              <input
                type="number"
                id="dissolved_oxygen"
                name="dissolved_oxygen"
                min="0"
                step="0.1"
                value={formData.dissolved_oxygen}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 6.5"
              />
            </div>

            <div>
              <label htmlFor="ammonia" className="block text-sm font-medium text-gray-700 mb-2">
                Ammonia (mg/L)
              </label>
              <input
                type="number"
                id="ammonia"
                name="ammonia"
                min="0"
                step="0.01"
                value={formData.ammonia}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 0.05"
              />
            </div>

            <div>
              <label htmlFor="nitrite" className="block text-sm font-medium text-gray-700 mb-2">
                Nitrite (mg/L)
              </label>
              <input
                type="number"
                id="nitrite"
                name="nitrite"
                min="0"
                step="0.01"
                value={formData.nitrite}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 0.02"
              />
            </div>

            <div>
              <label htmlFor="nitrate" className="block text-sm font-medium text-gray-700 mb-2">
                Nitrate (mg/L)
              </label>
              <input
                type="number"
                id="nitrate"
                name="nitrate"
                min="0"
                step="0.01"
                value={formData.nitrate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 0.1"
              />
            </div>

            <div>
              <label htmlFor="alkalinity" className="block text-sm font-medium text-gray-700 mb-2">
                Alkalinity (mg/L)
              </label>
              <input
                type="number"
                id="alkalinity"
                name="alkalinity"
                min="0"
                step="0.1"
                value={formData.alkalinity}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 120.0"
              />
            </div>

            <div>
              <label htmlFor="hardness" className="block text-sm font-medium text-gray-700 mb-2">
                Hardness (mg/L)
              </label>
              <input
                type="number"
                id="hardness"
                name="hardness"
                min="0"
                step="0.1"
                value={formData.hardness}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 150.0"
              />
            </div>

            <div>
              <label htmlFor="turbidity" className="block text-sm font-medium text-gray-700 mb-2">
                Turbidity (NTU)
              </label>
              <input
                type="number"
                id="turbidity"
                name="turbidity"
                min="0"
                step="0.1"
                value={formData.turbidity}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 2.5"
              />
            </div>
          </div>
        </div>

        {/* Fish Parameters (only for fish samples) */}
        {formData.sample_type === 'fish' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Fish className="h-5 w-5 mr-2 text-green-600" />
              Fish Parameters
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fish_weight_kg" className="block text-sm font-medium text-gray-700 mb-2">
                  Fish Weight (kg)
                </label>
                <input
                  type="number"
                  id="fish_weight_kg"
                  name="fish_weight_kg"
                  min="0"
                  step="0.001"
                  value={formData.fish_weight_kg}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="e.g., 0.150"
                />
              </div>

              <div>
                <label htmlFor="fish_length_ft" className="block text-sm font-medium text-gray-700 mb-2">
                  Fish Length (feet)
                </label>
                <input
                  type="number"
                  id="fish_length_ft"
                  name="fish_length_ft"
                  min="0"
                  step="0.01"
                  value={formData.fish_length_ft}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="e.g., 0.84"
                />
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
              placeholder="Record any observations, conditions, or additional information..."
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
            {isSubmitting ? 'Creating...' : 'Create Sample'}
          </button>
        </div>
      </form>
    </div>
  );
}
