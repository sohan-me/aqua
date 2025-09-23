'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, Package, DollarSign, Fish, Activity, Stethoscope, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface Item {
  item_id: number;
  name: string;
  item_type: 'inventory_part' | 'non_inventory' | 'service' | 'payment' | 'discount';
  uom: string;
  category: number | null;
  category_name?: string;
  income_account: number | null;
  income_account_name?: string;
  expense_account: number | null;
  expense_account_name?: string;
  asset_account: number | null;
  asset_account_name?: string;
  cost_of_goods_sold_account: number | null;
  cost_of_goods_sold_account_name?: string;
  description: string;
  active: boolean;
  created_at: string;
  current_price?: number;
  current_stock?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  stock_status?: string;
  is_low_stock?: boolean;
}

interface Account {
  account_id: number;
  name: string;
  code: string;
  account_type: string;
}

interface ItemCategory {
  item_category_id: number;
  name: string;
  description: string;
  parent: number | null;
}

const ITEM_TYPES = [
  { value: 'inventory_part', label: 'Inventory Part' },
  { value: 'non_inventory', label: 'Non-Inventory' },
  { value: 'service', label: 'Service' },
  { value: 'payment', label: 'Payment' },
  { value: 'discount', label: 'Discount' },
];

const UOM_OPTIONS = [
  'kg', 'pcs', 'pack', 'hr', 'day', 'month', 'year', 'liter', 'gallon', 'ton', 'box', 'bottle'
];

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    item_type: 'inventory_part' as 'inventory_part' | 'non_inventory' | 'service' | 'payment' | 'discount',
    uom: 'pcs',
    category: '',
    income_account: '',
    expense_account: '',
    cost_of_goods_sold_account: '',
    description: '',
    active: true,
    current_stock: 0,
    min_stock_level: 0,
    max_stock_level: 0,
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsResponse, accountsResponse, categoriesResponse] = await Promise.all([
        get('/items/'),
        get('/accounts/'),
        get('/item-categories/'),
      ]);
      
      setItems(itemsResponse.results || itemsResponse);
      setAccounts(accountsResponse.results || accountsResponse);
      setCategories(categoriesResponse.results || categoriesResponse);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to fetch data';
      toast.error(`Error: ${errorMessage}`);
      setItems([]);
      setAccounts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        category: formData.category && formData.category !== 'none' ? parseInt(formData.category) : null,
        income_account: formData.income_account && formData.income_account !== 'none' ? parseInt(formData.income_account) : null,
        expense_account: formData.expense_account && formData.expense_account !== 'none' ? parseInt(formData.expense_account) : null,
        cost_of_goods_sold_account: formData.cost_of_goods_sold_account && formData.cost_of_goods_sold_account !== 'none' ? parseInt(formData.cost_of_goods_sold_account) : null,
      };

      if (editingItem) {
        await put(`/items/${editingItem.item_id}/`, submitData);
        toast.success('Item updated successfully');
      } else {
        await post('/items/', submitData);
        toast.success('Item created successfully');
      }
      setIsDialogOpen(false);
      setEditingItem(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      item_type: item.item_type,
      uom: item.uom,
      category: item.category?.toString() || '',
      income_account: item.income_account?.toString() || '',
      expense_account: item.expense_account?.toString() || '',
      cost_of_goods_sold_account: item.cost_of_goods_sold_account?.toString() || '',
      description: item.description,
      active: item.active,
      current_stock: item.current_stock || 0,
      min_stock_level: item.min_stock_level || 0,
      max_stock_level: item.max_stock_level || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (itemId: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await del(`/items/${itemId}/`);
        toast.success('Item deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Failed to delete item');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      item_type: 'inventory_part',
      uom: 'pcs',
      category: '',
      income_account: '',
      expense_account: '',
      cost_of_goods_sold_account: '',
      description: '',
      active: true,
      current_stock: 0,
      min_stock_level: 0,
      max_stock_level: 0,
    });
  };

  const getItemTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'inventory_part':
        return <Package className="h-4 w-4" />;
      case 'service':
        return <Activity className="h-4 w-4" />;
      case 'payment':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getItemTypeColor = (itemType: string) => {
    switch (itemType) {
      case 'inventory_part':
        return 'bg-blue-100 text-blue-800';
      case 'service':
        return 'bg-green-100 text-green-800';
      case 'payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'discount':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatusBadge = (item: Item) => {
    if (item.current_stock === undefined || item.current_stock === null) return null;
    
    const stock = Number(item.current_stock);
    const minLevel = Number(item.min_stock_level) || 0;
    
    if (stock <= 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="h-3 w-3 mr-1" />
          Out of Stock
        </Badge>
      );
    } else if (stock <= minLevel) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Low Stock
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          In Stock
        </Badge>
      );
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    
    return matchesSearch && item.item_type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Items & Services</h1>
          <p className="text-gray-600 mt-1">Manage inventory items, services, and products</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingItem(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update item information' : 'Create a new item or service'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="stock">Stock</TabsTrigger>
                  <TabsTrigger value="accounts">Accounts</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Item name (e.g., Tilapia, Feed X, Medicine Y)"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="item_type">Item Type *</Label>
                      <Select
                        value={formData.item_type}
                        onValueChange={(value: any) => setFormData({ ...formData, item_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ITEM_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="uom">Unit of Measure</Label>
                      <Select
                        value={formData.uom}
                        onValueChange={(value) => setFormData({ ...formData, uom: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UOM_OPTIONS.map((uom) => (
                            <SelectItem key={uom} value={uom}>
                              {uom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.item_category_id} value={category.item_category_id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="active">Status</Label>
                      <Select
                        value={formData.active.toString()}
                        onValueChange={(value) => setFormData({ ...formData, active: value === 'true' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Active</SelectItem>
                          <SelectItem value="false">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Item description"
                      rows={3}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="stock" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="current_stock">Current Stock</Label>
                      <Input
                        id="current_stock"
                        type="number"
                        step="0.001"
                        value={formData.current_stock}
                        onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                        placeholder="0.000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_stock_level">Min Stock Level</Label>
                      <Input
                        id="min_stock_level"
                        type="number"
                        step="0.001"
                        value={formData.min_stock_level}
                        onChange={(e) => setFormData({ ...formData, min_stock_level: parseFloat(e.target.value) || 0 })}
                        placeholder="0.000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_stock_level">Max Stock Level</Label>
                      <Input
                        id="max_stock_level"
                        type="number"
                        step="0.001"
                        value={formData.max_stock_level}
                        onChange={(e) => setFormData({ ...formData, max_stock_level: parseFloat(e.target.value) || 0 })}
                        placeholder="0.000"
                      />
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Stock levels are automatically updated when inventory transactions occur. 
                      Set minimum stock level to receive low stock alerts.
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="accounts" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="income_account">Income Account</Label>
                      <Select
                        value={formData.income_account}
                        onValueChange={(value) => setFormData({ ...formData, income_account: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select income account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No income account</SelectItem>
                          {accounts.map((account) => (
                            <SelectItem key={account.account_id} value={account.account_id.toString()}>
                              {account.code} - {account.name} ({account.account_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expense_account">Expense Account</Label>
                      <Select
                        value={formData.expense_account}
                        onValueChange={(value) => setFormData({ ...formData, expense_account: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select expense account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No expense account</SelectItem>
                          {accounts.map((account) => (
                            <SelectItem key={account.account_id} value={account.account_id.toString()}>
                              {account.code} - {account.name} ({account.account_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost_of_goods_sold_account">Cost of Goods Sold Account</Label>
                      <Select
                        value={formData.cost_of_goods_sold_account}
                        onValueChange={(value) => setFormData({ ...formData, cost_of_goods_sold_account: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select COGS account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No COGS account</SelectItem>
                          {accounts.map((account) => (
                            <SelectItem key={account.account_id} value={account.account_id.toString()}>
                              {account.code} - {account.name} ({account.account_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                
              </Tabs>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingItem ? 'Update' : 'Create'} Item
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="inventory_part">Inventory Parts</SelectItem>
            <SelectItem value="service">Services</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.item_id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      {getItemTypeIcon(item.item_type)}
                      <span className="ml-2">{item.uom}</span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <Badge className={getItemTypeColor(item.item_type)}>
                      {ITEM_TYPES.find(t => t.value === item.item_type)?.label}
                    </Badge>
                    {getStockStatusBadge(item)}
                    {!item.active && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {item.description && (
                    <p className="text-sm text-gray-600">{item.description}</p>
                  )}
                  {item.income_account_name && (
                    <p className="text-sm text-gray-600">
                      <strong>Income Account:</strong> {item.income_account_name}
                    </p>
                  )}
                  {item.expense_account_name && (
                    <p className="text-sm text-gray-600">
                      <strong>Expense Account:</strong> {item.expense_account_name}
                    </p>
                  )}
                  {item.cost_of_goods_sold_account_name && (
                    <p className="text-sm text-gray-600">
                      <strong>COGS Account:</strong> {item.cost_of_goods_sold_account_name}
                    </p>
                  )}
                  {item.category_name && (
                    <p className="text-sm text-gray-600">
                      <strong>Category:</strong> {item.category_name}
                    </p>
                  )}
                  {item.current_price && (
                    <p className="text-sm font-semibold text-green-600">
                      <strong>Current Price:</strong> ${Number(item.current_price).toFixed(2)}
                    </p>
                  )}
                  {item.current_stock !== undefined && item.current_stock !== null && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-blue-600">
                        <strong>Current Stock:</strong> {Number(item.current_stock).toFixed(3)} {item.uom}
                      </p>
                      {item.min_stock_level && item.min_stock_level > 0 && (
                        <p className="text-sm text-gray-600">
                          <strong>Min Level:</strong> {Number(item.min_stock_level).toFixed(3)} {item.uom}
                        </p>
                      )}
                      {item.max_stock_level && item.max_stock_level > 0 && (
                        <p className="text-sm text-gray-600">
                          <strong>Max Level:</strong> {Number(item.max_stock_level).toFixed(3)} {item.uom}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item.item_id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredItems.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No items match your search criteria.' : 'Get started by adding your first item.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
