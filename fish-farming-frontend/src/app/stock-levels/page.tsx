'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Package, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface StockLevel {
  item_id: number;
  item_name: string;
  item_type: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number;
  unit_cost: number;
  total_value: number;
  status: 'low' | 'normal' | 'high' | 'out';
}

interface Item {
  item_id: number;
  name: string;
  item_type: string;
}

interface Pond {
  pond_id: number;
  name: string;
}

export default function StockLevelsPage() {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPond, setFilterPond] = useState('all');

  const { get } = useApi();

  useEffect(() => {
    fetchData();
  }, [filterPond]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build stock levels URL with pond filter
      let stockUrl = '/stock-levels/';
      if (filterPond !== 'all') {
        stockUrl += `?pond_id=${filterPond}`;
      }
      
      const [stockResponse, itemsResponse, pondsResponse] = await Promise.all([
        get(stockUrl),
        get('/items/'),
        get('/ponds/'),
      ]);
      
      console.log('Stock Levels Debug:', {
        stockResponse: stockResponse,
        itemsResponse: itemsResponse,
        stockLevelsCount: (stockResponse.results || stockResponse).length,
        itemsCount: (itemsResponse.results || itemsResponse).length
      });
      
      setStockLevels(stockResponse.results || stockResponse);
      setItems(itemsResponse.results || itemsResponse);
      setPonds(pondsResponse.results || pondsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch stock levels');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (current: number, minimum: number, maximum: number): 'low' | 'normal' | 'high' | 'out' => {
    if (current === 0) return 'out';
    if (current <= minimum) return 'low';
    if (current >= maximum) return 'high';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'low':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'out':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <Package className="h-4 w-4" />;
      case 'normal':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'out':
        return 'Out of Stock';
      case 'low':
        return 'Low Stock';
      case 'high':
        return 'High Stock';
      case 'normal':
        return 'Normal';
      default:
        return 'Unknown';
    }
  };

  const filteredStockLevels = stockLevels.filter(stock => {
    const matchesSearch = stock.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          stock.item_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || stock.item_type === filterType;
    const matchesStatus = filterStatus === 'all' || stock.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getUniqueItemTypes = () => {
    const types = [...new Set(stockLevels.map(stock => stock.item_type))];
    return types.sort();
  };

  const getStockSummary = () => {
    const total = stockLevels.length;
    const outOfStock = stockLevels.filter(s => s.status === 'out').length;
    const lowStock = stockLevels.filter(s => s.status === 'low').length;
    const highStock = stockLevels.filter(s => s.status === 'high').length;
    const normalStock = stockLevels.filter(s => s.status === 'normal').length;
    
    return { total, outOfStock, lowStock, highStock, normalStock };
  };

  const summary = getStockSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Levels</h1>
          <p className="text-gray-600 mt-1">Monitor inventory levels and stock status</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{summary.outOfStock}</div>
            <div className="text-sm text-gray-600">Out of Stock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{summary.lowStock}</div>
            <div className="text-sm text-gray-600">Low Stock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{summary.highStock}</div>
            <div className="text-sm text-gray-600">High Stock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{summary.normalStock}</div>
            <div className="text-sm text-gray-600">Normal Stock</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {getUniqueItemTypes().map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High Stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPond} onValueChange={setFilterPond}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by pond" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ponds</SelectItem>
            {ponds.map((pond) => (
              <SelectItem key={pond.pond_id} value={pond.pond_id.toString()}>
                {pond.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stock Levels Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading stock levels...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>Max Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStockLevels.map((stock) => (
                <TableRow key={stock.item_id}>
                  <TableCell className="font-medium">{stock.item_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{stock.item_type}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{stock.current_stock.toLocaleString()}</TableCell>
                  <TableCell>{stock.minimum_stock.toLocaleString()}</TableCell>
                  <TableCell>{stock.maximum_stock.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(stock.status)}>
                      {getStatusIcon(stock.status)}
                      <span className="ml-1">{getStatusLabel(stock.status)}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>${Number(stock.unit_cost).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">${stock.total_value.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {filteredStockLevels.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stock levels found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
              ? 'No items match your search criteria.' 
              : 'No stock levels are currently available.'}
          </p>
        </div>
      )}
    </div>
  );
}
