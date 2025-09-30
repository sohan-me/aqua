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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Package, Calendar, Users, Fish, ShoppingCart, X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface ItemSales {
  sale_id: number;
  sale_type: string;
  sale_date: string;
  customer_name?: string;
  pond_name?: string;
  total_amount: number;
  memo: string;
  created_at: string;
  total_lines: number;
}

interface ItemSalesLine {
  sale_line_id: number;
  sale_id: number;
  item_id: number;
  item_name?: string;
  qty: number;
  unit_price: number;
  total_price: number;
  memo: string;
}

interface Customer {
  customer_id: number;
  name: string;
  type: string;
}

interface Pond {
  pond_id: number;
  name: string;
}

interface Item {
  item_id: number;
  name: string;
  protein_content?: number;
  feed_stage?: string;
  selling_price?: number;
  uom: string;
  is_species?: boolean;
}

export default function ItemSalesPage() {
  const [itemSales, setItemSales] = useState<ItemSales[]>([]);
  const [salesLines, setSalesLines] = useState<ItemSalesLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<ItemSales | null>(null);
  const [showSalesLines, setShowSalesLines] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    sale_type: '',
    customer_id: '',
    pond_id: '',
    sale_date: '',
    memo: '',
  });
  const [lineItems, setLineItems] = useState<Partial<ItemSalesLine>[]>([]);

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salesResponse, customersResponse, pondsResponse, itemsResponse] = await Promise.all([
        get('/item-sales/'),
        get('/customers/'),
        get('/ponds/'),
        get('/items/'),
      ]);
      
      setItemSales(salesResponse.results || salesResponse);
      setCustomers(customersResponse.results || customersResponse);
      setPonds(pondsResponse.results || pondsResponse);
      const allItems = itemsResponse.results || itemsResponse;
      const inventoryItems = allItems.filter((item: Item) => !item.is_species);
      setItems(inventoryItems);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesLines = async (saleId: number) => {
    try {
      const response = await get(`/item-sales-lines/?item_sale=${saleId}`);
      setSalesLines(response.results || response);
    } catch (error) {
      console.error('Error fetching sales lines:', error);
      toast.error('Failed to fetch sales lines');
    }
  };

  const calculateTotals = () => {
    const totalAmount = lineItems.reduce((sum, line) => sum + ((line.qty || 0) * (line.unit_price || 0)), 0);
    return { totalAmount };
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      item_id: 0,
      qty: 0,
      unit_price: 0,
      total_price: 0,
      memo: '',
    }]);
  };

  const updateLineItem = (index: number, field: keyof ItemSalesLine, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate total price
    if (field === 'qty' || field === 'unit_price') {
      const qty = field === 'qty' ? value : updatedItems[index].qty || 0;
      const unitPrice = field === 'unit_price' ? value : updatedItems[index].unit_price || 0;
      updatedItems[index].total_price = qty * unitPrice;
    }
    
    setLineItems(updatedItems);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totals = calculateTotals();
      const salesData = {
        ...formData,
        customer: formData.customer_id ? parseInt(formData.customer_id) : null,
        pond: formData.pond_id ? parseInt(formData.pond_id) : null,
        total_amount: totals.totalAmount,
      };

      if (editingSale) {
        await put(`/item-sales/${editingSale.sale_id}/`, salesData);
        toast.success('Item sale updated successfully');
      } else {
        const response = await post('/item-sales/', salesData);
        
        // Create sales lines
        for (const line of lineItems) {
          if (line.item_id && line.qty && line.qty > 0) {
            await post('/item-sales-lines/', {
              item_sale: response.sale_id,
              item: line.item_id,
              qty: line.qty,
              unit_price: line.unit_price || 0,
              total_price: line.total_price || 0,
              memo: line.memo || '',
            });
          }
        }
        toast.success('Item sale created successfully');
      }
      setIsDialogOpen(false);
      setEditingSale(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving item sale:', error);
      toast.error('Failed to save item sale');
    }
  };

  const handleEdit = (sale: ItemSales) => {
    setEditingSale(sale);
    setFormData({
      sale_type: sale.sale_type,
      customer_id: '',
      pond_id: '',
      sale_date: sale.sale_date,
      memo: sale.memo,
    });
    setLineItems([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (saleId: number) => {
    if (confirm('Are you sure you want to delete this item sale?')) {
      try {
        await del(`/item-sales/${saleId}/`);
        toast.success('Item sale deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting item sale:', error);
        toast.error('Failed to delete item sale');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      sale_type: '',
      customer_id: '',
      pond_id: '',
      sale_date: '',
      memo: '',
    });
    setLineItems([]);
  };

  const filteredItemSales = itemSales.filter(sale =>
    sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.pond_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.memo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSaleTypeIcon = (saleType: string) => {
    switch (saleType) {
      case 'to_customer': return <Users className="h-4 w-4" />;
      case 'to_pond': return <Fish className="h-4 w-4" />;
      case 'internal_use': return <Package className="h-4 w-4" />;
      default: return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const getSaleTypeLabel = (saleType: string) => {
    switch (saleType) {
      case 'to_customer': return 'To Customer';
      case 'to_pond': return 'To Pond';
      case 'internal_use': return 'Internal Use';
      default: return saleType;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading item sales...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Item Sales</h1>
          <p className="text-gray-600">Manage sales and issues of items from inventory</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item Sale
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Item Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by customer, pond, or memo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredItemSales.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No item sales found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No item sales match your search criteria.' : 'Get started by recording your first item sale.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item Sale
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Customer/Pond</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItemSales.map((sale) => (
                <TableRow key={sale.sale_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSaleTypeIcon(sale.sale_type)}
                      <Badge variant="outline">{getSaleTypeLabel(sale.sale_type)}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {sale.customer_name || sale.pond_name || 'Internal Use'}
                  </TableCell>
                  <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                  <TableCell>${Number(sale.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowSalesLines(sale.sale_id);
                        fetchSalesLines(sale.sale_id);
                      }}
                    >
                      <Package className="h-4 w-4 mr-1" />
                      {sale.total_lines} lines
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(sale)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(sale.sale_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Sales Lines Modal */}
      {showSalesLines && (
        <Dialog open={true} onOpenChange={() => setShowSalesLines(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Sales Lines Details
              </DialogTitle>
              <DialogDescription>
                Detailed view of sales line items
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {salesLines.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No sales lines found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Memo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesLines.map((line) => (
                      <TableRow key={line.sale_line_id}>
                        <TableCell className="font-medium">{line.item_name}</TableCell>
                        <TableCell>{Number(line.qty).toFixed(2)}</TableCell>
                        <TableCell>${Number(line.unit_price).toFixed(2)}</TableCell>
                        <TableCell>${Number(line.total_price).toFixed(2)}</TableCell>
                        <TableCell>{line.memo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add/Edit Sale Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSale ? 'Edit Item Sale' : 'Add Item Sale'}
            </DialogTitle>
            <DialogDescription>
              {editingSale ? 'Update the item sale details' : 'Create a new item sale record'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="sale_type">Sale Type *</Label>
                <Select
                  value={formData.sale_type}
                  onValueChange={(value) => setFormData({ ...formData, sale_type: value })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select sale type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="to_customer">To Customer</SelectItem>
                    <SelectItem value="to_pond">To Pond</SelectItem>
                    <SelectItem value="internal_use">Internal Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_date">Sale Date *</Label>
                <Input
                  id="sale_date"
                  type="date"
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                  className="h-12"
                  required
                />
              </div>
              {formData.sale_type === 'to_customer' && (
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Customer *</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.filter(c => c.type === 'external_buyer').map((customer) => (
                        <SelectItem key={customer.customer_id} value={customer.customer_id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formData.sale_type === 'to_pond' && (
                <div className="space-y-2">
                  <Label htmlFor="pond_id">Pond *</Label>
                  <Select
                    value={formData.pond_id}
                    onValueChange={(value) => setFormData({ ...formData, pond_id: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select pond" />
                    </SelectTrigger>
                    <SelectContent>
                      {ponds.map((pond) => (
                        <SelectItem key={pond.pond_id} value={pond.pond_id.toString()}>
                          {pond.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2 col-span-2">
                <Label htmlFor="memo">Memo</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>

            {/* Sales Lines */}
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-medium">Sales Lines</Label>
                <Button type="button" onClick={addLineItem} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>
              </div>

              {lineItems.map((line, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-5 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Item *</Label>
                      <Select
                        value={line.item_id?.toString() || ''}
                        onValueChange={(value) => updateLineItem(index, 'item_id', parseInt(value))}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.item_id} value={item.item_id.toString()}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.qty || ''}
                        onChange={(e) => updateLineItem(index, 'qty', parseFloat(e.target.value) || 0)}
                        placeholder="Qty"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.unit_price || ''}
                        onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Total</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={line.total_price || ''}
                        placeholder="Auto-calculated"
                        className="h-12"
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Actions</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        className="h-12 w-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label>Memo</Label>
                    <Input
                      value={line.memo || ''}
                      onChange={(e) => updateLineItem(index, 'memo', e.target.value)}
                      placeholder="Line memo..."
                    />
                  </div>
                </Card>
              ))}

              {lineItems.length > 0 && (
                <Card className="p-4 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total Amount:</span>
                    <span className="text-xl font-bold text-green-600">
                      ${calculateTotals().totalAmount.toFixed(2)}
                    </span>
                  </div>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSale ? 'Update Sale' : 'Create Sale'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
