'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDailyLogById, useUpdateDailyLog, usePonds } from '@/hooks/useApi';
import { extractApiData } from '@/lib/utils';
import { Pond } from '@/lib/api';
import { ArrowLeft, Save, X, Calendar, Thermometer, Droplets, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function EditDailyLogPage() {
  const params = useParams();
  const router = useRouter();
  const dailyLogId = parseInt(params.id as string);
  
  const { data: dailyLog, isLoading: dailyLogLoading } = useDailyLogById(dailyLogId);
  const { data: pondsData } = usePonds();
  const updateDailyLog = useUpdateDailyLog();
  
  const ponds = extractApiData<Pond>(pondsData?.data);

  const [formData, setFormData] = useState({
    pond: '',
    date: '',
    weather: '',
    water_temp_c: '',
    ph: '',
    dissolved_oxygen: '',
    ammonia: '',
    nitrite: '',
    // East side measurements
    east_water_temp_c: '',
    east_ph: '',
    east_dissolved_oxygen: '',
    east_ammonia: '',
    east_nitrite: '',
    // West side measurements
    west_water_temp_c: '',
    west_ph: '',
    west_dissolved_oxygen: '',
    west_ammonia: '',
    west_nitrite: '',
    // North side measurements
    north_water_temp_c: '',
    north_ph: '',
    north_dissolved_oxygen: '',
    north_ammonia: '',
    north_nitrite: '',
    // South side measurements
    south_water_temp_c: '',
    south_ph: '',
    south_dissolved_oxygen: '',
    south_ammonia: '',
    south_nitrite: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when daily log data loads
  useEffect(() => {
    if (dailyLog) {
      setFormData({
        pond: dailyLog.data.pond?.toString() || '',
        date: dailyLog.data.date || '',
        weather: dailyLog.data.weather || '',
        water_temp_c: dailyLog.data.water_temp_c || '',
        ph: dailyLog.data.ph || '',
        dissolved_oxygen: dailyLog.data.dissolved_oxygen || '',
        ammonia: dailyLog.data.ammonia || '',
        nitrite: dailyLog.data.nitrite || '',
        // East side measurements
        east_water_temp_c: dailyLog.data.east_water_temp_c || '',
        east_ph: dailyLog.data.east_ph || '',
        east_dissolved_oxygen: dailyLog.data.east_dissolved_oxygen || '',
        east_ammonia: dailyLog.data.east_ammonia || '',
        east_nitrite: dailyLog.data.east_nitrite || '',
        // West side measurements
        west_water_temp_c: dailyLog.data.west_water_temp_c || '',
        west_ph: dailyLog.data.west_ph || '',
        west_dissolved_oxygen: dailyLog.data.west_dissolved_oxygen || '',
        west_ammonia: dailyLog.data.west_ammonia || '',
        west_nitrite: dailyLog.data.west_nitrite || '',
        // North side measurements
        north_water_temp_c: dailyLog.data.north_water_temp_c || '',
        north_ph: dailyLog.data.north_ph || '',
        north_dissolved_oxygen: dailyLog.data.north_dissolved_oxygen || '',
        north_ammonia: dailyLog.data.north_ammonia || '',
        north_nitrite: dailyLog.data.north_nitrite || '',
        // South side measurements
        south_water_temp_c: dailyLog.data.south_water_temp_c || '',
        south_ph: dailyLog.data.south_ph || '',
        south_dissolved_oxygen: dailyLog.data.south_dissolved_oxygen || '',
        south_ammonia: dailyLog.data.south_ammonia || '',
        south_nitrite: dailyLog.data.south_nitrite || '',
        notes: dailyLog.data.notes || ''
      });
    }
  }, [dailyLog]);

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
        // East side measurements
        east_water_temp_c: formData.east_water_temp_c ? parseFloat(formData.east_water_temp_c) : null,
        east_ph: formData.east_ph ? parseFloat(formData.east_ph) : null,
        east_dissolved_oxygen: formData.east_dissolved_oxygen ? parseFloat(formData.east_dissolved_oxygen) : null,
        east_ammonia: formData.east_ammonia ? parseFloat(formData.east_ammonia) : null,
        east_nitrite: formData.east_nitrite ? parseFloat(formData.east_nitrite) : null,
        // West side measurements
        west_water_temp_c: formData.west_water_temp_c ? parseFloat(formData.west_water_temp_c) : null,
        west_ph: formData.west_ph ? parseFloat(formData.west_ph) : null,
        west_dissolved_oxygen: formData.west_dissolved_oxygen ? parseFloat(formData.west_dissolved_oxygen) : null,
        west_ammonia: formData.west_ammonia ? parseFloat(formData.west_ammonia) : null,
        west_nitrite: formData.west_nitrite ? parseFloat(formData.west_nitrite) : null,
        // North side measurements
        north_water_temp_c: formData.north_water_temp_c ? parseFloat(formData.north_water_temp_c) : null,
        north_ph: formData.north_ph ? parseFloat(formData.north_ph) : null,
        north_dissolved_oxygen: formData.north_dissolved_oxygen ? parseFloat(formData.north_dissolved_oxygen) : null,
        north_ammonia: formData.north_ammonia ? parseFloat(formData.north_ammonia) : null,
        north_nitrite: formData.north_nitrite ? parseFloat(formData.north_nitrite) : null,
        // South side measurements
        south_water_temp_c: formData.south_water_temp_c ? parseFloat(formData.south_water_temp_c) : null,
        south_ph: formData.south_ph ? parseFloat(formData.south_ph) : null,
        south_dissolved_oxygen: formData.south_dissolved_oxygen ? parseFloat(formData.south_dissolved_oxygen) : null,
        south_ammonia: formData.south_ammonia ? parseFloat(formData.south_ammonia) : null,
        south_nitrite: formData.south_nitrite ? parseFloat(formData.south_nitrite) : null,
        notes: formData.notes
      };

      await updateDailyLog.mutateAsync({ id: dailyLogId, data: submitData });
      router.push('/daily-logs');
    } catch (error) {
      toast.error('Failed to update daily log');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/daily-logs');
  };

  if (dailyLogLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dailyLog) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Daily Log Not Found</h2>
        <p className="text-gray-600 mb-6">The daily log you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/daily-logs')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Daily Logs
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
            <h1 className="text-3xl font-bold text-gray-900">Edit Daily Log</h1>
            <p className="text-gray-600 mt-1">
              {dailyLog.data.pond_name} - {dailyLog.data.date}
            </p>
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
                  <option key={pond.pond_id} value={pond.pond_id}>
                    {pond.name} ({pond.water_area_decimal} decimal)
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

        {/* Legacy Water Quality Parameters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Droplets className="h-5 w-5 mr-2 text-blue-600" />
            General Water Quality Parameters (Optional)
          </h2>
          <p className="text-sm text-gray-600 mb-4">These are legacy fields. For detailed measurements, use the directional water quality sections below.</p>
          
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

        {/* East Side Water Quality */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
            East Side Water Quality
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="east_water_temp_c" className="block text-sm font-medium text-red-700 mb-2">
                Water Temperature (°C)
              </label>
              <input
                type="number"
                id="east_water_temp_c"
                name="east_water_temp_c"
                min="0"
                max="50"
                step="0.1"
                value={formData.east_water_temp_c}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 25.5"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="east_ph" className="block text-sm font-medium text-red-700 mb-2">
                pH Level
              </label>
              <input
                type="number"
                id="east_ph"
                name="east_ph"
                min="0"
                max="14"
                step="0.1"
                value={formData.east_ph}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 7.2"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="east_dissolved_oxygen" className="block text-sm font-medium text-red-700 mb-2">
                Dissolved Oxygen (mg/L)
              </label>
              <input
                type="number"
                id="east_dissolved_oxygen"
                name="east_dissolved_oxygen"
                min="0"
                step="0.1"
                value={formData.east_dissolved_oxygen}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 6.5"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="east_ammonia" className="block text-sm font-medium text-red-700 mb-2">
                Ammonia (mg/L)
              </label>
              <input
                type="number"
                id="east_ammonia"
                name="east_ammonia"
                min="0"
                step="0.01"
                value={formData.east_ammonia}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 0.05"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="east_nitrite" className="block text-sm font-medium text-red-700 mb-2">
                Nitrite (mg/L)
              </label>
              <input
                type="number"
                id="east_nitrite"
                name="east_nitrite"
                min="0"
                step="0.01"
                value={formData.east_nitrite}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-red-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 0.02"
              />
            </div>
          </div>
        </div>

        {/* West Side Water Quality */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm border border-orange-200 p-6">
          <h2 className="text-lg font-semibold text-orange-900 mb-4 flex items-center">
            <div className="w-4 h-4 bg-orange-500 rounded-full mr-3"></div>
            West Side Water Quality
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="west_water_temp_c" className="block text-sm font-medium text-orange-700 mb-2">
                Water Temperature (°C)
              </label>
              <input
                type="number"
                id="west_water_temp_c"
                name="west_water_temp_c"
                min="0"
                max="50"
                step="0.1"
                value={formData.west_water_temp_c}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 25.5"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="west_ph" className="block text-sm font-medium text-orange-700 mb-2">
                pH Level
              </label>
              <input
                type="number"
                id="west_ph"
                name="west_ph"
                min="0"
                max="14"
                step="0.1"
                value={formData.west_ph}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 7.2"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="west_dissolved_oxygen" className="block text-sm font-medium text-orange-700 mb-2">
                Dissolved Oxygen (mg/L)
              </label>
              <input
                type="number"
                id="west_dissolved_oxygen"
                name="west_dissolved_oxygen"
                min="0"
                step="0.1"
                value={formData.west_dissolved_oxygen}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 6.5"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="west_ammonia" className="block text-sm font-medium text-orange-700 mb-2">
                Ammonia (mg/L)
              </label>
              <input
                type="number"
                id="west_ammonia"
                name="west_ammonia"
                min="0"
                step="0.01"
                value={formData.west_ammonia}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 0.05"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="west_nitrite" className="block text-sm font-medium text-orange-700 mb-2">
                Nitrite (mg/L)
              </label>
              <input
                type="number"
                id="west_nitrite"
                name="west_nitrite"
                min="0"
                step="0.01"
                value={formData.west_nitrite}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 0.02"
              />
            </div>
          </div>
        </div>

        {/* North Side Water Quality */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm border border-green-200 p-6">
          <h2 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
            North Side Water Quality
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="north_water_temp_c" className="block text-sm font-medium text-green-700 mb-2">
                Water Temperature (°C)
              </label>
              <input
                type="number"
                id="north_water_temp_c"
                name="north_water_temp_c"
                min="0"
                max="50"
                step="0.1"
                value={formData.north_water_temp_c}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 25.5"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="north_ph" className="block text-sm font-medium text-green-700 mb-2">
                pH Level
              </label>
              <input
                type="number"
                id="north_ph"
                name="north_ph"
                min="0"
                max="14"
                step="0.1"
                value={formData.north_ph}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 7.2"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="north_dissolved_oxygen" className="block text-sm font-medium text-green-700 mb-2">
                Dissolved Oxygen (mg/L)
              </label>
              <input
                type="number"
                id="north_dissolved_oxygen"
                name="north_dissolved_oxygen"
                min="0"
                step="0.1"
                value={formData.north_dissolved_oxygen}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 6.5"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="north_ammonia" className="block text-sm font-medium text-green-700 mb-2">
                Ammonia (mg/L)
              </label>
              <input
                type="number"
                id="north_ammonia"
                name="north_ammonia"
                min="0"
                step="0.01"
                value={formData.north_ammonia}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 0.05"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="north_nitrite" className="block text-sm font-medium text-green-700 mb-2">
                Nitrite (mg/L)
              </label>
              <input
                type="number"
                id="north_nitrite"
                name="north_nitrite"
                min="0"
                step="0.01"
                value={formData.north_nitrite}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 0.02"
              />
            </div>
          </div>
        </div>

        {/* South Side Water Quality */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm border border-purple-200 p-6">
          <h2 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
            <div className="w-4 h-4 bg-purple-500 rounded-full mr-3"></div>
            South Side Water Quality
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="south_water_temp_c" className="block text-sm font-medium text-purple-700 mb-2">
                Water Temperature (°C)
              </label>
              <input
                type="number"
                id="south_water_temp_c"
                name="south_water_temp_c"
                min="0"
                max="50"
                step="0.1"
                value={formData.south_water_temp_c}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 25.5"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="south_ph" className="block text-sm font-medium text-purple-700 mb-2">
                pH Level
              </label>
              <input
                type="number"
                id="south_ph"
                name="south_ph"
                min="0"
                max="14"
                step="0.1"
                value={formData.south_ph}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 7.2"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="south_dissolved_oxygen" className="block text-sm font-medium text-purple-700 mb-2">
                Dissolved Oxygen (mg/L)
              </label>
              <input
                type="number"
                id="south_dissolved_oxygen"
                name="south_dissolved_oxygen"
                min="0"
                step="0.1"
                value={formData.south_dissolved_oxygen}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 6.5"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="south_ammonia" className="block text-sm font-medium text-purple-700 mb-2">
                Ammonia (mg/L)
              </label>
              <input
                type="number"
                id="south_ammonia"
                name="south_ammonia"
                min="0"
                step="0.01"
                value={formData.south_ammonia}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 0.05"
              />
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <label htmlFor="south_nitrite" className="block text-sm font-medium text-purple-700 mb-2">
                Nitrite (mg/L)
              </label>
              <input
                type="number"
                id="south_nitrite"
                name="south_nitrite"
                min="0"
                step="0.01"
                value={formData.south_nitrite}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
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
              Notes
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
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Updating...' : 'Update Daily Log'}
          </button>
        </div>
      </form>
    </div>
  );
}
