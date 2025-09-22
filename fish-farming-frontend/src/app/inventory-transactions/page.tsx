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
import { Plus, Search, Edit, Trash2, Package, Calendar, ShoppingCart, ArrowUpDown } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface InventoryTransaction {
  transaction_id: number;
  transaction_type: 'in' | 'out' | 'transfer';
  transaction_date: string;
  reference: string;
  memo: string;
  created_at: string;
  updated_at: string;
}

interface InventoryTransactionLine {
  inv_txn_line_id: number;
  transaction_id: number;
  item_id: number;
  item_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface Item {
  item_id: number;
  name: string;
  item_type: string;
}

const TRANSACTION_TYPES = [
  { value: 'in', label: 'Stock In', icon: '⬆️' },
  { value: 'out', label: 'Stock Out', icon: '⬇️' },
  { value: 'transfer', label: 'Transfer', icon: '🔄' }
];

export default function InventoryTransactionsPage() {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [transactionLines, setTransactionLines] = useState<InventoryTransactionLine[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<InventoryTransaction | null>(null);
  const [showTransactionLines, setShowTransactionLines] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    transaction_type: '',
    transaction_date: '',
    reference: '',
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
      const [transactionsResponse, itemsResponse] = await Promise.all([
        get('/inventory-transactions/'),
        get('/items/'),
      ]);
      
      setTransactions(transactionsResponse.results || transactionsResponse);
      setItems(itemsResponse.results || itemsResponse);
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
    const totalQuantity = lineItems.reduce((sum, line) => sum + (line.quantity || 0), 0);
    const totalCost = lineItems.reduce((sum, line) => sum + (line.total_cost || 0), 0);
    return { totalQuantity, totalCost };
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      item_id: 0,
      quantity: 0,
      unit_cost: 0,
      total_cost: 0,
    }]);
  };

  const updateLineItem = (index: number, field: keyof InventoryTransactionLine, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Calculate total cost
    if (field === 'quantity' || field === 'unit_cost') {
      const quantity = updated[index].quantity || 0;
      const cost = updated[index].unit_cost || 0;
      updated[index].total_cost = quantity * cost;
    }
    
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totals = calculateTotals();
      const transactionData = {
        ...formData,
        reference: formData.reference || `TXN-${Date.now()}`,
        memo: `${totals.totalQuantity} items, ${totals.totalCost.toFixed(2)} total cost`,
      };

      if (editingTransaction) {
        await put(`/inventory-transactions/${editingTransaction.transaction_id}/`, transactionData);
        toast.success('Inventory transaction updated successfully');
      } else {
        const response = await post('/inventory-transactions/', transactionData);
        
        // Create transaction lines
        for (const line of lineItems) {
          await post(`/inventory-transactions/${response.transaction_id}/lines/`, {
            ...line,
            transaction_id: response.transaction_id,
            quantity: line.quantity || 0,
            unit_cost: line.unit_cost || 0,
            total_cost: line.total_cost || 0,
          });
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
      transaction_type: transaction.transaction_type,
      transaction_date: transaction.transaction_date,
      reference: transaction.reference,
      memo: transaction.memo,
    });
    setLineItems([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (transactionId: number) => {
    if (confirm('Are you sure you want to delete this inventory transaction?')) {
      try {
        await del(`/inventory-transactions/${transactionId}/`);
        toast.success('Inventory transaction deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting inventory transaction:', error);
        toast.error('Failed to delete inventory transaction');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_type: '',
      transaction_date: '',
      reference: '',
      memo: '',
    });
    setLineItems([]);
  };

  const getTransactionTypeLabel = (type: string) => {
    const transactionType = TRANSACTION_TYPES.find(t => t.value === type);
    return transactionType ? transactionType.label : type;
  };

  const getTransactionTypeIcon = (type: string) => {
    const transactionType = TRANSACTION_TYPES.find(t => t.value === type);
    return transactionType ? transactionType.icon : '📦';
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.memo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTransactionTypeLabel(transaction.transaction_type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Transactions</h1>
          <p className="text-gray-600 mt-1">Track inventory movements and stock adjustments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingTransaction(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Edit Inventory Transaction' : 'Add New Inventory Transaction'}</DialogTitle>
              <DialogDescription>
                {editingTransaction ? 'Update inventory transaction information' : 'Record a new inventory movement'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_type">Transaction Type *</Label>
                  <Select
                    value={formData.transaction_type}
                    onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transaction_date">Transaction Date *</Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Transaction reference number"
                    className="h-12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">Memo</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Additional notes about the transaction"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              {/* Transaction Lines */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Transaction Lines</Label>
                  <Button type="button" variant="outline" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {lineItems.map((line, index) => (
                    <Card key={index} className="p-6">
                      <div className="grid grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Item</Label>
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
                                  {item.name} ({item.item_type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={line.quantity || ''}
                            onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
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
                            placeholder="Cost per unit"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Total Cost</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={line.total_cost || 0}
                              readOnly
                              className="bg-gray-50 h-12"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-700 h-12 px-3"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {calculateTotals().totalQuantity.toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-600">Total Quantity</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ${calculateTotals().totalCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-purple-600">Total Cost</div>
                  </div>
                </div>
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

      {/* Transactions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading transactions...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.transaction_id}>
                  <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getTransactionTypeIcon(transaction.transaction_type)} {getTransactionTypeLabel(transaction.transaction_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{transaction.reference}</TableCell>
                  <TableCell className="max-w-xs truncate">{transaction.memo}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
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
                        onClick={() => {
                          if (showTransactionLines === transaction.transaction_id) {
                            setShowTransactionLines(null);
                          } else {
                            setShowTransactionLines(transaction.transaction_id);
                            fetchTransactionLines(transaction.transaction_id);
                          }
                        }}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(transaction.transaction_id)}
                        className="text-red-600 hover:text-red-700"
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

      {filteredTransactions.length === 0 && !loading && (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No transactions match your search criteria.' : 'Get started by recording your first inventory transaction.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          )}
        </div>
      )}
    </div>
  );
}