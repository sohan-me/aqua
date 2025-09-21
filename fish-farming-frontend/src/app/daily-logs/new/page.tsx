'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateDailyLog, usePonds } from '@/hooks/useApi';
import { extractApiData } from '@/lib/utils';
import { Pond } from '@/lib/api';
import { ArrowLeft, Save, X, Droplets } from 'lucide-react';
import { toast } from 'sonner';

export default function NewDailyLogPage() {
  const router = useRouter();
  const createDailyLog = useCreateDailyLog();
  const { data: pondsData } = usePonds();
  
  const ponds = extractApiData<Pond>(pondsData);

  const [formData, setFormData] = useState({
    pond: '',
    date: new Date().toISOString().split('T')[0],
    weather: '',
    water_temp_c: '',
    ph: '',
    dissolved_oxygen: '',
    ammonia: '',
    nitrite: '',
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
        weather: formData.weather,
        water_temp_c: formData.water_temp_c ? parseFloat(formData.water_temp_c) : null,
        ph: formData.ph ? parseFloat(formData.ph) : null,
        dissolved_oxygen: formData.dissolved_oxygen ? parseFloat(formData.dissolved_oxygen) : null,
        ammonia: formData.ammonia ? parseFloat(formData.ammonia) : null,
        nitrite: formData.nitrite ? parseFloat(formData.nitrite) : null,
        notes: formData.notes
      };

      await createDailyLog.mutateAsync(submitData);
      router.push('/daily-logs');
    } catch (error) {
      toast.error('Failed to create daily log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/daily-logs');
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
            <h1 className="text-3xl font-bold text-gray-900">Add New Daily Log</h1>
            <p className="text-gray-600 mt-1">Record daily pond conditions and activities</p>
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
              <label htmlFor="weather" className="block text-sm font-medium text-gray-700 mb-2">
                Weather
              </label>
              <input
                type="text"
                id="weather"
                name="weather"
                value={formData.weather}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., Sunny, Cloudy, Rainy"
              />
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
              <label htmlFor="water_temp_c" className="block text-sm font-medium text-gray-700 mb-2">
                Water Temperature (°C)
              </label>
              <input
                type="number"
                id="water_temp_c"
                name="water_temp_c"
                min="0"
                max="50"
                step="0.1"
                value={formData.water_temp_c}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 25.5"
              />
            </div>

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
          </div>
        </div>

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
              placeholder="Record any observations, activities, or concerns..."
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
            {isSubmitting ? 'Creating...' : 'Create Daily Log'}
          </button>
        </div>
      </form>
    </div>
  );
}
