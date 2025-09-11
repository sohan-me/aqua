'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateFeed, usePonds, useFeedTypes } from '@/hooks/useApi';
import { ArrowLeft, Save, X, Fish, Clock, Package } from 'lucide-react';
import { toast } from 'sonner';

export default function NewFeedingPage() {
  const router = useRouter();
  const createFeed = useCreateFeed();
  const { data: pondsData } = usePonds();
  const { data: feedTypesData } = useFeedTypes();
  
  const ponds = pondsData?.data || [];
  const feedTypes = feedTypesData?.data || [];

  const [formData, setFormData] = useState({
    pond: '',
    feed_type: '',
    date: new Date().toISOString().split('T')[0],
    amount_kg: '',
    feeding_time: '',
    cost_per_packet: '',
    biomass_at_feeding_kg: '',
    notes: ''
  });

  const [inputMode, setInputMode] = useState<'packets' | 'kg'>('packets');
  const [packetCount, setPacketCount] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePacketCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPacketCount(value);
    
    // Calculate kg from packets (25kg per packet)
    if (value && !isNaN(parseFloat(value))) {
      const kg = parseFloat(value) * 25;
      setFormData(prev => ({
        ...prev,
        amount_kg: kg.toString()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        amount_kg: ''
      }));
    }
  };

  const handleAmountKgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      amount_kg: value
    }));
    
    // Calculate packets from kg (25kg per packet)
    if (value && !isNaN(parseFloat(value))) {
      const packets = parseFloat(value) / 25;
      setPacketCount(packets.toString());
    } else {
      setPacketCount('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        pond: parseInt(formData.pond),
        feed_type: parseInt(formData.feed_type),
        date: formData.date,
        amount_kg: parseFloat(formData.amount_kg),
        feeding_time: formData.feeding_time || null,
        cost_per_packet: formData.cost_per_packet ? parseFloat(formData.cost_per_packet) : null,
        biomass_at_feeding_kg: formData.biomass_at_feeding_kg ? parseFloat(formData.biomass_at_feeding_kg) : null,
        notes: formData.notes
      };

      await createFeed.mutateAsync(submitData);
      router.push('/feeding');
    } catch (error) {
      toast.error('Failed to create feeding record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/feeding');
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
            <h1 className="text-3xl font-bold text-gray-900">Add Feeding Record</h1>
            <p className="text-gray-600 mt-1">Record feeding activities and schedules</p>
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
              <label htmlFor="feed_type" className="block text-sm font-medium text-gray-700 mb-2">
                Feed Type *
              </label>
              <select
                id="feed_type"
                name="feed_type"
                required
                value={formData.feed_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              >
                <option value="">Select feed type</option>
                {feedTypes.map((feedType) => (
                  <option key={feedType.id} value={feedType.id}>
                    {feedType.name} {feedType.protein_content && `(${feedType.protein_content}% protein)`}
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
          </div>
        </div>

        {/* Feeding Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Fish className="h-5 w-5 mr-2 text-blue-600" />
            Feeding Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Mode Toggle */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Input Method
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="inputMode"
                    value="packets"
                    checked={inputMode === 'packets'}
                    onChange={(e) => setInputMode(e.target.value as 'packets' | 'kg')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Packets (25kg per packet)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="inputMode"
                    value="kg"
                    checked={inputMode === 'kg'}
                    onChange={(e) => setInputMode(e.target.value as 'packets' | 'kg')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Direct kg input</span>
                </label>
              </div>
            </div>

            {/* Packet Input */}
            {inputMode === 'packets' && (
              <div>
                <label htmlFor="packetCount" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Packets *
                </label>
                <input
                  type="number"
                  id="packetCount"
                  name="packetCount"
                  required
                  min="0.01"
                  step="0.01"
                  value={packetCount}
                  onChange={handlePacketCountChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="e.g., 2"
                />
                {packetCount && !isNaN(parseFloat(packetCount)) && (
                  <p className="text-sm text-gray-600 mt-1">
                    = {parseFloat(packetCount) * 25} kg
                  </p>
                )}
              </div>
            )}

            {/* Direct kg Input */}
            {inputMode === 'kg' && (
              <div>
                <label htmlFor="amount_kg" className="block text-sm font-medium text-gray-700 mb-2">
                  Feed Amount (kg) *
                </label>
                <input
                  type="number"
                  id="amount_kg"
                  name="amount_kg"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.amount_kg}
                  onChange={handleAmountKgChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="e.g., 2.5"
                />
                {formData.amount_kg && !isNaN(parseFloat(formData.amount_kg)) && (
                  <p className="text-sm text-gray-600 mt-1">
                    = {parseFloat(formData.amount_kg) / 25} packets
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="feeding_time" className="block text-sm font-medium text-gray-700 mb-2">
                Feeding Time
              </label>
              <input
                type="time"
                id="feeding_time"
                name="feeding_time"
                value={formData.feeding_time}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
              />
            </div>
          </div>

          {/* Cost and Biomass Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label htmlFor="cost_per_packet" className="block text-sm font-medium text-gray-700 mb-2">
                Cost per Packet (৳)
              </label>
              <input
                type="number"
                id="cost_per_packet"
                name="cost_per_packet"
                min="0"
                step="0.01"
                value={formData.cost_per_packet}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 1125.00"
              />
              <p className="text-xs text-gray-500 mt-1">Enter the cost per packet (25kg) of this feed type</p>
            </div>

            <div>
              <label htmlFor="biomass_at_feeding_kg" className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Fish Biomass (kg)
              </label>
              <input
                type="number"
                id="biomass_at_feeding_kg"
                name="biomass_at_feeding_kg"
                min="0"
                step="0.1"
                value={formData.biomass_at_feeding_kg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="e.g., 150.5"
              />
              <p className="text-xs text-gray-500 mt-1">Estimated total fish weight in pond</p>
            </div>
          </div>

          {/* Cost Calculation Preview */}
          {formData.cost_per_packet && formData.amount_kg && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Cost Calculation Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Feed Cost:</span>
                  <span className="ml-2 font-semibold text-blue-900">
                    ৳{((parseFloat(formData.amount_kg) / 25) * parseFloat(formData.cost_per_packet)).toFixed(2)}
                  </span>
                </div>
                {formData.biomass_at_feeding_kg && (
                  <div>
                    <span className="text-blue-700">Feeding Rate:</span>
                    <span className="ml-2 font-semibold text-blue-900">
                      {((parseFloat(formData.amount_kg) / parseFloat(formData.biomass_at_feeding_kg)) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
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
              placeholder="Record any observations, feeding behavior, or additional information..."
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
            {isSubmitting ? 'Creating...' : 'Create Feeding Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
