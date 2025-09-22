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
import { Plus, Search, Edit, Trash2, Package, Calendar, Truck, Eye } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface InventoryTransaction {
  inv_txn_id: number;
  txn_type: string;
  txn_date: string;
  memo: string;
  user_username: string;
  bill_vendor_name?: string;
  check_no?: string;
  created_at: string;
  updated_at: string;
}

interface InventoryTransactionLine {
  inv_txn_line_id: number;
  inventory_transaction: number;
  item_id: number;
  item_name?: string;
  qty: number;
  unit_cost: number;
  pond_name?: string;
  memo: string;
}

interface Vendor {
  vendor_id: number;
  name: string;
}

interface Item {
  item_id: number;
  name: string;
  is_species: boolean;
  item_type: string;
  uom: string;
}

export default function InventoryStockingPage() {
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [transactionLines, setTransactionLines] = useState<InventoryTransactionLine[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<InventoryTransaction | null>(null);
  const [showTransactionLines, setShowTransactionLines] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    txn_date: new Date().toISOString().split('T')[0],
    txn_type: 'RECEIPT_WITH_BILL',
    memo: '',
  });
  const [lineItems, setLineItems] = useState<Partial<InventoryTransactionLine>[]>([]);

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transactionsResponse, vendorsResponse, itemsResponse] = await Promise.all([
        get('/inventory-transactions/'),
        get('/vendors/'),
        get('/items/'),
      ]);
      
      setInventoryTransactions(transactionsResponse.results || transactionsResponse);
      setVendors(vendorsResponse.results || vendorsResponse);
      const allItems = itemsResponse.results || itemsResponse;
      const nonSpeciesItems = allItems.filter((item: Item) => !item.is_species);
      setItems(nonSpeciesItems);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionLines = async (transactionId: number) => {
    try {
      const response = await get(`/inventory-transactions/${transactionId}/lines/`);
      setTransactionLines(response.results || response);
    } catch (error) {
      console.error('Error fetching transaction lines:', error);
    }
  };

  const calculateTotals = () => {
    const totalQuantity = lineItems.reduce((sum, line) => sum + (line.qty || 0), 0);
    const totalCost = lineItems.reduce((sum, line) => sum + ((line.qty || 0) * (line.unit_cost || 0)), 0);
    return { totalQuantity, totalCost };
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      item_id: 0,
      qty: 0,
      unit_cost: 0,
    }]);
  };

  const updateLineItem = (index: number, field: keyof InventoryTransactionLine, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      txn_date: new Date().toISOString().split('T')[0],
      txn_type: 'RECEIPT_WITH_BILL',
      memo: '',
    });
    setLineItems([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const transactionData = {
        txn_type: formData.txn_type,
        txn_date: formData.txn_date,
        memo: formData.memo,
      };

      if (editingTransaction) {
        await put(`/inventory-transactions/${editingTransaction.inv_txn_id}/`, transactionData);
        toast.success('Inventory transaction updated successfully');
      } else {
        const response = await post('/inventory-transactions/', transactionData);
        
        // Create transaction lines
        for (const line of lineItems) {
          if (line.item_id && line.qty > 0) {
            await post('/inventory-transaction-lines/', {
              inventory_transaction: response.inv_txn_id,
              item: line.item_id,
              qty: line.qty,
              unit_cost: line.unit_cost || 0,
              memo: line.memo || '',
            });
          }
        }
        
        toast.success('Inventory transaction created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingTransaction(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving inventory transaction:', error);
      toast.error('Failed to save inventory transaction');
    }
  };

  const handleEdit = (transaction: InventoryTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      txn_date: transaction.txn_date,
      txn_type: transaction.txn_type,
      memo: transaction.memo,
    });
    setLineItems([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (transaction: InventoryTransaction) => {
    if (confirm('Are you sure you want to delete this inventory transaction?')) {
      try {
        await del(`/inventory-transactions/${transaction.inv_txn_id}/`);
        toast.success('Inventory transaction deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting inventory transaction:', error);
        toast.error('Failed to delete inventory transaction');
      }
    }
  };

  const filteredTransactions = inventoryTransactions.filter(transaction =>
    transaction.memo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.txn_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Stocking</h1>
          <p className="text-gray-600 mt-1">Manage inventory transactions and stock levels</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingTransaction(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Inventory Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Edit Inventory Transaction' : 'Add New Inventory Transaction'}</DialogTitle>
              <DialogDescription>
                {editingTransaction ? 'Update inventory transaction information' : 'Record a new inventory transaction'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="txn_date">Transaction Date *</Label>
                  <Input
                    id="txn_date"
                    type="date"
                    value={formData.txn_date}
                    onChange={(e) => setFormData({ ...formData, txn_date: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="txn_type">Transaction Type *</Label>
                  <Select
                    value={formData.txn_type}
                    onValueChange={(value) => setFormData({ ...formData, txn_type: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECEIPT_WITH_BILL">Receipt with Bill</SelectItem>
                      <SelectItem value="RECEIPT_NO_BILL">Receipt without Bill</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                      <SelectItem value="ISSUE_TO_POND">Issue to Pond</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 py-4">
                <Label htmlFor="memo">Memo</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Enter transaction memo..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Line Items */}
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Transaction Lines</h3>
                  <Button type="button" onClick={addLineItem} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line Item
                  </Button>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {lineItems.map((line, index) => (
                    <Card key={index} className="p-6">
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
                                  {item.name} ({item.uom})
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
                            placeholder="Quantity"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Unit Cost</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.unit_cost || ''}
                            onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                            placeholder="Unit cost"
                            className="h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Memo</Label>
                          <Input
                            value={line.memo || ''}
                            onChange={(e) => updateLineItem(index, 'memo', e.target.value)}
                            placeholder="Line memo"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => removeLineItem(index)}
                            className="h-12 w-full"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {lineItems.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total Quantity: {calculateTotals().totalQuantity}</span>
                      <span>Total Cost: ${calculateTotals().totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingTransaction ? 'Update' : 'Create'} Transaction
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Inventory Transactions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading inventory transactions...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No inventory transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.inv_txn_id}>
                    <TableCell className="font-medium">
                      #{transaction.inv_txn_id}
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.txn_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.txn_type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.memo || '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowTransactionLines(transaction.inv_txn_id);
                            fetchTransactionLines(transaction.inv_txn_id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(transaction)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Transaction Lines Modal */}
      {showTransactionLines && (
        <Dialog open={true} onOpenChange={() => setShowTransactionLines(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Transaction Lines - #{showTransactionLines}
              </DialogTitle>
              <DialogDescription>
                View detailed line items for this inventory transaction
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {transactionLines.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No line items found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Pond</TableHead>
                      <TableHead>Memo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionLines.map((line) => (
                      <TableRow key={line.inv_txn_line_id}>
                        <TableCell className="font-medium">
                          {line.item_name || `Item #${line.item_id}`}
                        </TableCell>
                        <TableCell>{line.qty}</TableCell>
                        <TableCell>${line.unit_cost.toFixed(2)}</TableCell>
                        <TableCell>${(line.qty * line.unit_cost).toFixed(2)}</TableCell>
                        <TableCell>{line.pond_name || '-'}</TableCell>
                        <TableCell>{line.memo || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}