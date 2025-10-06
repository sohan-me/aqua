'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calculator, Fish, Package, Building2, DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Pond {
  pond_id: number;
  name: string;
  water_area_decimal: number;
  area_sqm: number;
}

interface Item {
  item_id: number;
  name: string;
  category: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  unit: string;
}

interface CustomerStock {
  customer_stock_id: number;
  customer: {
    name: string;
  };
  pond: {
    pond_id: number;
    name: string;
  };
  item: Item;
  current_stock: number;
  unit_cost: number;
  unit: string;
}

interface AssetCalculationResult {
  pond_name: string;
  pond_area_decimal: number;
  pond_area_sqm: number;
  fish_biomass_value: number;
  feed_inventory_value: number;
  medicine_inventory_value: number;
  equipment_value: number;
  total_assets: number;
  asset_breakdown: {
    fish_biomass: number;
    feed_stock: number;
    medicine_stock: number;
    equipment: number;
  };
  recommendations: string[];
  warnings: string[];
}

export default function AssetCalculatorPage() {
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [customerStocks, setCustomerStocks] = useState<CustomerStock[]>([]);
  const [selectedPondId, setSelectedPondId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AssetCalculationResult | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch ponds
      const pondsResponse = await fetch('http://127.0.0.1:8000/api/fish-farming/ponds/', { headers });
      const pondsData = await pondsResponse.json();
      setPonds(pondsData.results || []);

      // Fetch items
      const itemsResponse = await fetch('http://127.0.0.1:8000/api/fish-farming/items/', { headers });
      const itemsData = await itemsResponse.json();
      setItems(itemsData.results || []);

      // Fetch customer stocks
      const stocksResponse = await fetch('http://127.0.0.1:8000/api/fish-farming/customer-stocks/', { headers });
      const stocksData = await stocksResponse.json();
      setCustomerStocks(stocksData.results || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    }
  };

  const calculateAssets = async () => {
    if (!selectedPondId) {
      toast.error('Please select a pond');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://127.0.0.1:8000/api/fish-farming/asset-calculator/calculate/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pond_id: parseInt(selectedPondId),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        toast.success('Asset calculation completed');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to calculate assets');
      }
    } catch (error) {
      console.error('Error calculating assets:', error);
      toast.error('Error calculating assets');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPondId('');
    setResult(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const selectedPond = ponds.find(pond => pond.pond_id.toString() === selectedPondId);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calculator className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Asset Calculator</h1>
                <p className="text-gray-600">Calculate total assets for a specific pond</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pond Selection</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pond *</label>
              <select
                value={selectedPondId}
                onChange={(e) => setSelectedPondId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a pond</option>
                {ponds.map((pond) => (
                  <option key={pond.pond_id} value={pond.pond_id.toString()}>
                    {pond.name} ({pond.water_area_decimal} decimal)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end space-x-4">
              <button
                onClick={calculateAssets}
                disabled={!selectedPondId || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Calculating...</span>
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    <span>Calculate Assets</span>
                  </>
                )}
              </button>
              
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Fish className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Fish Biomass</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.fish_biomass_value)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Feed Inventory</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.feed_inventory_value)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Medicine Inventory</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.medicine_inventory_value)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <Building2 className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Equipment</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(result.equipment_value)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Assets */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Total Assets</h3>
                    <p className="text-gray-600">{result.pond_name} ({result.pond_area_decimal} decimal)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(result.total_assets)}</p>
                  <p className="text-sm text-gray-500">Per sqm: {formatCurrency(result.total_assets / result.pond_area_sqm)}</p>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Fish Biomass Value</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(result.asset_breakdown.fish_biomass)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Feed Stock Value</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(result.asset_breakdown.feed_stock)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Medicine Stock Value</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(result.asset_breakdown.medicine_stock)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">Equipment Value</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(result.asset_breakdown.equipment)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-gray-50 rounded-lg px-4">
                  <span className="font-bold text-gray-900">Total Assets</span>
                  <span className="font-bold text-lg text-green-600">{formatCurrency(result.total_assets)}</span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                  Recommendations
                </h2>
                <ul className="space-y-2">
                  {result.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-yellow-600" />
                  Warnings
                </h2>
                <ul className="space-y-2">
                  {result.warnings.map((warning: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <AlertCircle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
