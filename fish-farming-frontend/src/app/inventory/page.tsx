'use client';

import { useState } from 'react';
import { useCustomerStocks, usePonds } from '@/hooks/useApi';
import { CustomerStock, Pond } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
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
  EyeOff,
  DollarSign,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPond, setSelectedPond] = useState<number | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'last_updated' | 'status'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedPonds, setExpandedPonds] = useState<Set<number>>(new Set());

  // Fetch data
  const { data: customerStocksData, isLoading: stocksLoading, refetch: refetchStocks } = useCustomerStocks();
  const { data: pondsData, isLoading: pondsLoading } = usePonds();
  
  const customerStocks = extractApiData<CustomerStock>(customerStocksData?.data);
  const ponds = extractApiData<Pond>(pondsData?.data);
  const { get } = useApi();
  const [movementsById, setMovementsById] = useState<Record<number, any[]>>({});
  const [loadingMovements, setLoadingMovements] = useState<Record<number, boolean>>({});
  const [movementsModal, setMovementsModal] = useState<{open: boolean; stockId?: number; title?: string}>({open: false});

  const openMovements = async (cs: CustomerStock) => {
    const id = (cs as any).customer_stock_id as number;
    setLoadingMovements(prev => ({ ...prev, [id]: true }));
    try {
      const resp = await get(`/customer-stocks/${id}/movements/`);
      setMovementsById(prev => ({ ...prev, [id]: resp }));
      setMovementsModal({ open: true, stockId: id, title: `${(cs as any).pond_name || 'Pond'} • ${(cs as any).item_name}` });
    } catch (e) {
      setMovementsById(prev => ({ ...prev, [id]: [] }));
      setMovementsModal({ open: true, stockId: id, title: `${(cs as any).pond_name || 'Pond'} • ${(cs as any).item_name}` });
    } finally {
      setLoadingMovements(prev => ({ ...prev, [id]: false }));
    }
  };


  const parseNumber = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatRelativeTime = (isoDate: string | null | undefined): string => {
    if (!isoDate) return '—';
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay}d ago`;
    const diffMon = Math.floor(diffDay / 30);
    if (diffMon < 12) return `${diffMon}mo ago`;
    const diffYr = Math.floor(diffMon / 12);
    return `${diffYr}y ago`;
  };


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

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        const an = (a.item_name || '').toLowerCase();
        const bn = (b.item_name || '').toLowerCase();
        return an.localeCompare(bn);
      }
      if (sortBy === 'last_updated') {
        const ad = new Date(a.last_updated || a.created_at || 0).getTime();
        const bd = new Date(b.last_updated || b.created_at || 0).getTime();
        return ad - bd;
      }
      if (sortBy === 'status') {
        const order: Record<string, number> = { out_of_stock: 0, low_stock: 1, in_stock: 2, overstocked: 3 };
        const av = order[a.stock_status] ?? 99;
        const bv = order[b.stock_status] ?? 99;
        return av - bv;
      }
      return 0;
    });

    if (sortDir === 'desc') sorted.reverse();

    return sorted;
  };

  // KPI calculations
  const totals = (() => {
    const stocks = customerStocks || [];
    let totalFishWeightKg = 0;
    let totalFishCount = 0;
    let totalFeedKg = 0;
    let totalInventoryValue = 0;

    for (const s of stocks) {
      const sAny = s as any;
      const categoryName = String((sAny?.category ?? sAny?.item_category_name ?? '')).toLowerCase();
      const isFish = categoryName === 'fish';
      const isFeed = categoryName === 'feed';
      if (isFish) {
        totalFishWeightKg += parseNumber(sAny?.fish_total_weight_kg);
        totalFishCount += parseNumber(sAny?.fish_count);
      }
      if (isFeed) {
        const unitLower = String((s.unit ?? sAny?.item_unit ?? '')).toLowerCase();
        if (unitLower === 'kg') {
          totalFeedKg += parseNumber(s.current_stock);
        }
      }
      const qty = parseNumber(s.current_stock);
      const cost = parseNumber(s.unit_cost);
      totalInventoryValue += qty * cost;
    }

    return { totalFishWeightKg, totalFishCount, totalFeedKg, totalInventoryValue };
  })();

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
    const pond = ponds?.find((p: Pond) => p.pond_id === pondId);
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
          <div className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-2 py-1 inline-block">
            External sales with a selected pond now deduct that pond's stock.
          </div>
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
              {ponds?.map((pond: Pond) => (
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
        {/* Sorting and Cost Controls */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Sort By</label>
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'last_updated' | 'status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="last_updated">Last Updated</option>
                <option value="status">Stock Status</option>
              </select>
              <button
                onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title={`Direction: ${sortDir}`}
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Show Costs</label>
            <button
              onClick={() => setShowCosts(!showCosts)}
              className={`w-full px-3 py-2 border rounded-lg flex items-center justify-center ${
                showCosts ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-700'
              }`}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {showCosts ? 'Hide Costs' : 'Show Costs'}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Data Freshness</label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-400" />
              Updated {customerStocks && customerStocks.length > 0 ? formatRelativeTime(customerStocks[0].last_updated || customerStocks[0].created_at) : '—'}
            </div>
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

      {/* Movements Modal */}
      <Dialog open={movementsModal.open} onOpenChange={(open) => setMovementsModal(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Stock Movements{movementsModal.title ? ` • ${movementsModal.title}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Qty (kg)</TableHead>
                  <TableHead>Species (pcs)</TableHead>
                  <TableHead>pcs/kg</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Ref</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(movementsModal.stockId && movementsById[movementsModal.stockId] || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-gray-500">No movements found.</TableCell>
                  </TableRow>
                ) : (
                  (movementsById[movementsModal.stockId as number] || []).map((m: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>{new Date(m.date).toLocaleDateString()}</TableCell>
                      <TableCell className={m.direction === 'in' ? 'text-green-600' : 'text-red-600'}>{m.direction.toUpperCase()}</TableCell>
                      <TableCell>{Number(m.qty_kg).toFixed(2)}</TableCell>
                      <TableCell>{m.fish_count ?? '—'}</TableCell>
                      <TableCell>{m.line_number ? Number(m.line_number).toFixed(2) : '—'}</TableCell>
                      <TableCell className="capitalize">{m.source}</TableCell>
                      <TableCell>#{m.ref}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Package className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Fish Weight</p>
              <p className="text-2xl font-bold text-gray-900">{totals.totalFishWeightKg.toFixed(2)} kg</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Fish Count</p>
              <p className="text-2xl font-bold text-gray-900">{totals.totalFishCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Package className="h-6 w-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Feed (kg)</p>
              <p className="text-2xl font-bold text-gray-900">{totals.totalFeedKg.toFixed(0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.totalInventoryValue)}</p>
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
              const pondValue = stocks.reduce((sum, s) => sum + parseNumber(s.current_stock) * parseNumber(s.unit_cost), 0);
              const pondFishCount = stocks.reduce((sum, s) => {
                const sAny = s as any;
                const categoryName = String((sAny?.category ?? sAny?.item_category_name ?? '')).toLowerCase();
                return sum + (categoryName === 'fish' ? parseNumber(sAny?.fish_count) : 0);
              }, 0);
              const pondFishWeight = stocks.reduce((sum, s) => {
                const sAny = s as any;
                const categoryName = String((sAny?.category ?? sAny?.item_category_name ?? '')).toLowerCase();
                return sum + (categoryName === 'fish' ? parseNumber(sAny?.fish_total_weight_kg) : 0);
              }, 0);
              
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
                        <p className="text-sm text-gray-500">{stocks.length} items • {pondFishCount} fish • {pondFishWeight.toFixed(1)} kg {showCosts && `• ${formatCurrency(pondValue)}`}</p>
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
                          const qty = parseNumber(stock.current_stock);
                          const cost = parseNumber(stock.unit_cost);
                          const lineValue = qty * cost;
                          const sAny = stock as any;
                          const categoryName = String((sAny?.category ?? sAny?.item_category_name ?? '')).toLowerCase();
                          const isFish = categoryName === 'fish';
                          
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
                                    {(stock.unit === 'packet' || stock.unit === 'pack') && (stock as any).packet_size && (
                                      <span className="text-green-600 ml-2 font-semibold">
                                        = {(qty * (sAny.packet_size ?? 0)).toFixed(2)} kg
                                      </span>
                                    )}
                                  </p>
                                  {isFish && (
                                    <p className="text-sm text-gray-700 mb-2">
                                      <span className="mr-4">Weight: <span className="font-medium">{parseNumber(sAny?.fish_total_weight_kg).toFixed(2)} kg</span></span>
                                      <span>Count: <span className="font-medium">{parseNumber(sAny?.fish_count)}</span></span>
                                    </p>
                                  )}
                              <div className="flex items-center justify-between">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                                      {getStatusText(stock.stock_status)}
                                    </span>
                                    <div className="text-right">
                                      <div className="text-xs text-gray-500 flex items-center justify-end"><Clock className="h-3 w-3 mr-1" />{formatRelativeTime(stock.last_updated || stock.created_at)}</div>
                                      {showCosts && (
                                        <div className="text-sm text-gray-700">
                                          {formatCurrency(cost)}/{stock.unit} • <span className="font-semibold">{formatCurrency(lineValue)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                              <div className="mt-2">
                                <button
                                  onClick={() => openMovements(stock)}
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  View Movements
                                </button>
                                {loadingMovements[(stock as any).customer_stock_id] && (
                                  <div className="text-xs text-gray-500 mt-2">Loading movements...</div>
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
