'use client';

import { useState } from 'react';
import { useCustomerStocks, usePonds } from '@/hooks/useApi';
import { CustomerStock } from '@/lib/api';
import { extractApiData } from '@/lib/utils';
import { 
  Package, 
  Search, 
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPond, setSelectedPond] = useState<number | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [expandedPonds, setExpandedPonds] = useState<Set<number>>(new Set());

  // Fetch data
  const { data: customerStocksData, isLoading: stocksLoading, refetch: refetchStocks } = useCustomerStocks();
  const { data: pondsData, isLoading: pondsLoading } = usePonds();
  
  const customerStocks = extractApiData<CustomerStock>(customerStocksData?.data);
  const ponds = extractApiData(pondsData?.data);


  // Filter stocks based on search and filters
  const getFilteredStocks = () => {
    let filtered = customerStocks || [];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(stock => 
        stock.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.pond_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Pond filter
    if (selectedPond) {
      filtered = filtered.filter(stock => stock.pond === selectedPond);
    }

    // Item type filter
    if (selectedItemType) {
      filtered = filtered.filter(stock => stock.item_type === selectedItemType);
    }

    // Low stock filter
    if (showLowStockOnly) {
      filtered = filtered.filter(stock => 
        stock.stock_status === 'low_stock' || stock.stock_status === 'out_of_stock'
      );
    }

    return filtered;
  };

  // Group stocks by pond
  const getStocksByPond = () => {
    const filtered = getFilteredStocks();
    const grouped: { [key: number]: CustomerStock[] } = {};
    
    filtered.forEach(stock => {
      if (stock.pond) {
        if (!grouped[stock.pond]) {
          grouped[stock.pond] = [];
        }
        grouped[stock.pond].push(stock);
      }
    });

    return grouped;
  };

  // Get pond name by ID
  const getPondName = (pondId: number) => {
    const pond = ponds?.find(p => p.pond_id === pondId);
    return pond?.name || `Pond ${pondId}`;
  };

  // Get unique item types
  const getItemTypes = () => {
    const types = new Set(customerStocks?.map(stock => stock.item_type) || []);
    return Array.from(types).sort();
  };

  // Toggle pond expansion
  const togglePondExpansion = (pondId: number) => {
    const newExpanded = new Set(expandedPonds);
    if (newExpanded.has(pondId)) {
      newExpanded.delete(pondId);
    } else {
      newExpanded.add(pondId);
    }
    setExpandedPonds(newExpanded);
  };

  // Get status icon and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' };
      case 'low_stock':
        return { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' };
      case 'overstocked':
        return { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' };
      default:
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' };
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'out_of_stock':
        return 'Out of Stock';
      case 'low_stock':
        return 'Low Stock';
      case 'overstocked':
        return 'Overstocked';
      default:
        return 'In Stock';
    }
  };


  const stocksByPond = getStocksByPond();
  const itemTypes = getItemTypes();

  if (stocksLoading || pondsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="h-8 w-8 mr-3 text-blue-600" />
            Inventory Management
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor inventory stocks across all ponds
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items, ponds..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Pond Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Filter by Pond</label>
            <select
              value={selectedPond || ''}
              onChange={(e) => setSelectedPond(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Ponds</option>
              {ponds?.map(pond => (
                <option key={pond.pond_id} value={pond.pond_id}>
                  {pond.name}
                </option>
              ))}
            </select>
          </div>

          {/* Item Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Filter by Item Type</label>
            <select
              value={selectedItemType || ''}
              onChange={(e) => setSelectedItemType(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              {itemTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Low Stock Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Show Low Stock Only</label>
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`w-full px-3 py-2 border rounded-lg flex items-center justify-center ${
                showLowStockOnly
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-700'
                  : 'bg-gray-50 border-gray-300 text-gray-700'
              }`}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {showLowStockOnly ? 'Hide' : 'Show'} Low Stock
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{customerStocks?.length || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {customerStocks?.filter(s => s.stock_status === 'in_stock').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {customerStocks?.filter(s => s.stock_status === 'low_stock').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {customerStocks?.filter(s => s.stock_status === 'out_of_stock').length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock List by Pond */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Inventory by Pond</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {Object.keys(stocksByPond).length === 0 ? (
            <div className="p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Inventory Items</h3>
              <p className="text-gray-500">
                No inventory items found matching your filters.
              </p>
            </div>
          ) : (
            Object.entries(stocksByPond).map(([pondId, stocks]) => {
              const pondIdNum = parseInt(pondId);
              const isExpanded = expandedPonds.has(pondIdNum);
              const pondName = getPondName(pondIdNum);
              
              return (
                <div key={pondId} className="p-6">
                  {/* Pond Header */}
                  <button
                    onClick={() => togglePondExpansion(pondIdNum)}
                    className="w-full flex items-center justify-between text-left hover:bg-gray-50 p-2 rounded-lg"
                  >
                    <div className="flex items-center">
                      {isExpanded ? (
                        <EyeOff className="h-5 w-5 text-gray-400 mr-3" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 mr-3" />
                      )}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{pondName}</h3>
                        <p className="text-sm text-gray-500">{stocks.length} items</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {/* Status indicators */}
                      <div className="flex space-x-2">
                        {stocks.filter(s => s.stock_status === 'out_of_stock').length > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {stocks.filter(s => s.stock_status === 'out_of_stock').length} Out
                          </span>
                        )}
                        {stocks.filter(s => s.stock_status === 'low_stock').length > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {stocks.filter(s => s.stock_status === 'low_stock').length} Low
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Stock Items */}
                  {isExpanded && (
                    <div className="mt-4 ml-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {stocks.map(stock => {
                          const statusInfo = getStatusInfo(stock.stock_status);
                          const StatusIcon = statusInfo.icon;
                          
                          return (
                            <div key={stock.customer_stock_id} className={`border rounded-lg p-4 ${statusInfo.bg}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center mb-2">
                                    <StatusIcon className={`h-5 w-5 mr-2 ${statusInfo.color}`} />
                                    <h4 className="font-medium text-gray-900">{stock.item_name}</h4>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-1">
                                    {stock.item_type}
                                    {(stock.unit === 'packet' || stock.unit === 'pack') && stock.packet_size && (
                                      <span className="text-blue-600 ml-2">
                                        (Packet size: {stock.packet_size} kg)
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-700 mb-2">
                                    <span className="font-medium">{stock.current_stock} {stock.unit}</span>
                                    {stock.min_stock_level > 0 && (
                                      <span className="text-gray-500 ml-2">
                                        (Min: {stock.min_stock_level} {stock.unit})
                                      </span>
                                    )}
                                    {(stock.unit === 'packet' || stock.unit === 'pack') && stock.packet_size && (
                                      <span className="text-green-600 ml-2 font-semibold">
                                        = {(stock.current_stock * stock.packet_size).toFixed(2)} kg
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                                      {getStatusText(stock.stock_status)}
                                    </span>
                                    {stock.unit_cost && (
                                      <span className="text-sm text-gray-600">
                                        ${Number(stock.unit_cost).toFixed(2)}/{stock.unit}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
