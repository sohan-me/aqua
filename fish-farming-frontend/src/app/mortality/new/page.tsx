'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateMortality, usePonds, useSpecies, useCustomerStocks } from '@/hooks/useApi';
import { extractApiData } from '@/lib/utils';
import { Pond, Species, CustomerStock } from '@/lib/api';
import { ArrowLeft, Save, X, Fish, TrendingDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function NewMortalityPage() {
  const router = useRouter();
  const createMortality = useCreateMortality();
  const { data: pondsData } = usePonds();
  const { data: speciesData } = useSpecies();
  const { data: customerStocksData } = useCustomerStocks();
  
  const ponds = extractApiData<Pond>(pondsData?.data);
  const species = extractApiData<Species>(speciesData?.data);
  const allCustomerStocks = extractApiData<CustomerStock>(customerStocksData?.data);

  const [formData, setFormData] = useState({
    pond: '',
    date: new Date().toISOString().split('T')[0],
    cause: '',
    notes: ''
  });

  type MortalityEntry = {
    customerStockId: string;
    itemName: string;
    count: string;
    avgWeightKg: number | null;
  };

  const [entries, setEntries] = useState<MortalityEntry[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fetch latest fish sampling avg weight for pond+species
  const fetchLatestAvgWeight = async (pondId: string, speciesId?: string): Promise<number | null> => {
    try {
      if (!pondId) return null;
      const params = new URLSearchParams();
      params.append('pond', pondId);
      if (speciesId) params.append('species', speciesId);
      params.append('ordering', '-date');
      params.append('page_size', '1');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/fish-sampling/?${params.toString()}`.replace(/\/$/, ''), {
        headers: {
          'Authorization': `Token ${localStorage.getItem('authToken')}`,
        },
      });
      if (!response.ok) return null;
      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      if (results.length === 0) return null;
      const avg = parseFloat(results[0]?.average_weight_kg);
      return isNaN(avg) ? null : avg;
    } catch {
      return null;
    }
  };

  const addEntry = () => {
    setEntries(prev => ([...prev, { customerStockId: '', itemName: '', count: '', avgWeightKg: null }]));
  };

  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleEntryStockChange = async (index: number, customerStockId: string) => {
    const cs = allCustomerStocks.find(s => s.customer_stock_id === (customerStockId ? parseInt(customerStockId) : -1));
    const itemName = cs?.item_name || '';
    let avgWeightKg: number | null = null;
    if (cs && cs.fish_total_weight_kg && cs.fish_count) {
      const total = Number(cs.fish_total_weight_kg);
      const cnt = Number(cs.fish_count);
      avgWeightKg = cnt > 0 ? total / cnt : null;
    } else {
      // fallback: try latest sampling for the pond
      avgWeightKg = await fetchLatestAvgWeight(formData.pond, '');
    }
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, customerStockId, itemName, avgWeightKg } : e));
    if (avgWeightKg == null) {
      toast.warning(`No recent sampling found for ${itemName || 'selected fish'}. Avg weight unavailable.`);
    }
  };

  const handleEntryCountChange = (index: number, count: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, count } : e));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.pond) {
        toast.error('Please select a pond.');
        return;
      }
      if (entries.length === 0) {
        toast.error('Add at least one species entry.');
        return;
      }

      // Submit one record per entry
      for (const entry of entries) {
        if (!entry.customerStockId || !entry.count) continue;
        const submitData: any = {
          pond: parseInt(formData.pond),
          date: formData.date,
          count: parseInt(entry.count),
          cause: formData.cause || null,
          notes: formData.notes || ''
        };
        if (entry.avgWeightKg != null) {
          submitData.avg_weight_kg = entry.avgWeightKg;
          // total weight to deduct from stock
          const totalWeight = parseInt(entry.count) * entry.avgWeightKg;
          if (!isNaN(totalWeight)) {
            submitData.total_weight_kg = Number(totalWeight.toFixed(3));
          }
        }
        // link to customer stock for automatic deduction and movement
        submitData.customer_stock_id = parseInt(entry.customerStockId);
        await createMortality.mutateAsync(submitData);
      }

      router.push('/mortality');
    } catch (error) {
      console.error('Error creating mortality record:', error);
      toast.error('Failed to create mortality record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonCauses = [
    'Disease',
    'Poor Water Quality',
    'Oxygen Depletion',
    'Predation',
    'Stress',
    'Old Age',
    'Accident',
    'Unknown'
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Mortality Tracking
        </button>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Add Mortality Record</h1>
          <p className="text-gray-600">Record fish mortality events and track causes</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Fish className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h2>
            
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
                      {pond.name}
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

          {/* Mortality Details - Multiple Species */}
          <div className="bg-red-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
              Mortality Details
            </h2>
            
            <div className="space-y-4">
              {entries.map((entry, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white rounded-md p-4 border border-red-100">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fish from Customer Stock *</label>
                    <select
                      value={entry.customerStockId}
                      onChange={(e) => handleEntryStockChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select fish stock</option>
                      {allCustomerStocks
                        .filter((cs) => cs.item_type === 'inventory_part' && cs.category === 'fish' && (formData.pond ? cs.pond === parseInt(formData.pond) : true))
                        .map((cs) => (
                          <option key={cs.customer_stock_id} value={cs.customer_stock_id.toString()}>
                            {cs.item_name} {cs.pond_name ? `(${cs.pond_name})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number Died *</label>
                    <input
                      type="number"
                      min={1}
                      value={entry.count}
                      onChange={(e) => handleEntryCountChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Count"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Avg Weight (kg)</label>
                    <input
                      type="text"
                      readOnly
                      value={entry.avgWeightKg != null ? entry.avgWeightKg.toFixed(3) : 'N/A'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
                    />
                  </div>

                  <div className="md:col-span-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Total Weight: {entry.avgWeightKg != null && entry.count ? (parseInt(entry.count || '0') * entry.avgWeightKg).toFixed(3) : 'N/A'} kg
                    </div>
                    <button type="button" onClick={() => removeEntry(index)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addEntry}
                className="px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
              >
                + Add Species
              </button>
            </div>
          </div>

          {/* Cause and Notes */}
          <div className="bg-orange-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
              Cause and Analysis
            </h2>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="cause" className="block text-sm font-medium text-gray-700 mb-2">
                  Cause of Mortality
                </label>
                <select
                  id="cause"
                  name="cause"
                  value={formData.cause}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                >
                  <option value="">Select a cause</option>
                  {commonCauses.map((cause) => (
                    <option key={cause} value={cause}>
                      {cause}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="Add any additional observations, symptoms, or details about the mortality event..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="h-4 w-4 mr-2 inline" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMortality.isPending}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2 inline" />
              {isSubmitting || createMortality.isPending ? 'Recording...' : 'Record Mortality'}
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Mortality Tracking Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Common Causes:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• Disease: Bacterial, viral, or parasitic infections</li>
              <li>• Poor Water Quality: High ammonia, low oxygen, pH issues</li>
              <li>• Oxygen Depletion: Equipment failure, overstocking</li>
              <li>• Stress: Handling, transport, environmental changes</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Best Practices:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• Record mortalities daily for accurate tracking</li>
              <li>• Note average weight to track growth patterns</li>
              <li>• Document symptoms and environmental conditions</li>
              <li>• Use this data to improve farm management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
