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
import { Plus, Search, Edit, Trash2, FileText, Calendar, DollarSign, User } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface Invoice {
  invoice_id: number;
  customer_id: number;
  customer_name?: string;
  invoice_no: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  open_balance: number;
  memo: string;
  created_at: string;
  updated_at: string;
}

interface InvoiceLine {
  invoice_line_id: number;
  invoice_id: number;
  item_id: number;
  item_name?: string;
  description?: string;
  qty: number;
  rate: number;
  amount: number;
}


interface Customer {
  customer_id: number;
  name: string;
}

interface Item {
  item_id: number;
  name: string;
  item_type: string;
  uom: string;
  current_stock: number;
  total_stock_kg?: number;
  selling_price?: number;
  income_account?: number;
  stock_entries?: Array<{
    entry_id: number;
    quantity: number;
    unit: string;
    packet_size?: number;
    kg_equivalent?: number;
  }>;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [showInvoiceLines, setShowInvoiceLines] = useState<number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [currentInvoiceLines, setCurrentInvoiceLines] = useState<InvoiceLine[]>([]);
  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_no: '',
    invoice_date: new Date().toISOString().split('T')[0], // Today's date
    memo: '',
  });
  const [lineItems, setLineItems] = useState<Partial<InvoiceLine>[]>([]);

  const { get, post, put, delete: del } = useApi();

  // Calculate correct stock in kg from stock entries
  const calculateCorrectStockKg = (item: Item): number => {
    if (!item.stock_entries || item.stock_entries.length === 0) {
      return item.total_stock_kg || 0;
    }

    let totalKg = 0;
    for (const entry of item.stock_entries) {
      const quantity = parseFloat(entry.quantity.toString());
      
      if (entry.unit === 'kg') {
        totalKg += quantity;
      } else if (entry.unit === 'pcs') {
        // Convert pieces to kg - assuming 1 piece = 1 kg for feed items
        totalKg += quantity;
      } else if (entry.unit === 'packet' || entry.unit === 'pack') {
        if (entry.packet_size) {
          // Convert packets to kg using packet size
          totalKg += quantity * parseFloat(entry.packet_size.toString());
        } else {
          // If no packet size, assume 1 packet = 1 kg
          totalKg += quantity;
        }
      }
    }
    
    // Round to avoid floating point precision issues
    return Math.round(totalKg * 100) / 100;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchNextInvoiceNumber = async () => {
    try {
      const response = await get('/invoices/next_invoice_number/');
      if (response.next_invoice_number) {
        setFormData(prev => ({ ...prev, invoice_no: response.next_invoice_number }));
      }
    } catch (error) {
      console.error('Error fetching next invoice number:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesResponse, customersResponse, itemsResponse] = await Promise.all([
        get('/invoices/'),
        get('/customers/'),
        get('/items/'),
      ]);
      
      setInvoices(invoicesResponse.results || invoicesResponse);
      setCustomers(customersResponse.results || customersResponse);
      setItems(itemsResponse.results || itemsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceLines = async (invoiceId: number) => {
    try {
      console.log('Fetching invoice lines for invoice ID:', invoiceId);
      const response = await get(`/invoice-lines/?invoice=${invoiceId}`);
      const lines = response.results || response;
      console.log('Fetched invoice lines:', lines);
      setInvoiceLines(lines);
      setCurrentInvoiceLines(lines);
    } catch (error) {
      console.error('Error fetching invoice lines:', error);
      setInvoiceLines([]);
      setCurrentInvoiceLines([]);
    }
  };

  const calculateTotals = () => {
    const totalAmount = lineItems.reduce((sum, line) => sum + (line.amount || 0), 0);
    return { totalAmount };
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      item_id: 0,
      description: '',
      qty: 0,
      rate: 0,
      amount: 0,
    }]);
  };

  const updateLineItem = (index: number, field: keyof InvoiceLine, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-fill unit price when item is selected
    if (field === 'item_id' && value) {
      const selectedItem = items.find(item => item.item_id === value);
      if (selectedItem && selectedItem.selling_price) {
        updated[index].rate = selectedItem.selling_price;
      }
    }
    
    // Calculate total price
      if (field === 'qty' || field === 'rate') {
      const quantity = updated[index].qty || 0;
      const price = updated[index].rate || 0;
      updated[index].amount = quantity * price;
    }
    
    setLineItems(updated);
  };

  const checkStockAvailability = (itemId: number, quantity: number) => {
    const item = items.find(i => i.item_id === itemId);
    if (!item) return { available: false, message: 'Item not found' };
    
    const availableStock = calculateCorrectStockKg(item);
    if (availableStock <= 0) {
      return { 
        available: false, 
        message: `Item is out of stock. Current stock: ${availableStock} kg` 
      };
    }
    
    if (availableStock < quantity) {
      return { 
        available: false, 
        message: `Insufficient stock. Available: ${availableStock} kg, Required: ${quantity} kg` 
      };
    }
    
    return { available: true, message: `Stock available: ${availableStock} kg` };
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.customer_id) {
      toast.error('Please select a customer');
      return;
    }
    
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    
    // Validate line items
    for (let i = 0; i < lineItems.length; i++) {
      const line = lineItems[i];
      if (!line.item_id || line.item_id === 0) {
        toast.error(`Please select an item for line ${i + 1}`);
        return;
      }
      if (!line.qty || line.qty <= 0) {
        toast.error(`Please enter a valid quantity for line ${i + 1}`);
        return;
      }
      if (!line.rate || line.rate <= 0) {
        toast.error(`Please enter a valid unit price for line ${i + 1}`);
        return;
      }
    }
    
    // Check stock availability for all line items
    const stockChecks = lineItems.map(line => {
      if (line.item_id && line.qty) {
        return checkStockAvailability(line.item_id, line.qty);
      }
      return { available: true, message: '' };
    });
    
    const insufficientStock = stockChecks.find(check => !check.available);
    if (insufficientStock) {
      toast.error(insufficientStock.message);
      return;
    }
    
    try {
      const totals = calculateTotals();
      const invoiceData = {
        ...formData,
        customer: parseInt(formData.customer_id),
        invoice_no: formData.invoice_no || `INV-${Date.now()}`,
        total_amount: totals.totalAmount,
        open_balance: totals.totalAmount,
      };
      
      console.log('Invoice data being sent:', invoiceData);

      if (editingInvoice) {
        await put(`/invoices/${editingInvoice.invoice_id}/`, invoiceData);
        
        // Delete existing invoice lines
        const existingLines = await get(`/invoice-lines/?invoice=${editingInvoice.invoice_id}`);
        const linesToDelete = existingLines.results || existingLines;
        for (const line of linesToDelete) {
          await del(`/invoice-lines/${line.invoice_line_id}/`);
        }
        
        // Create new invoice lines
        for (const line of lineItems) {
          await post('/invoice-lines/', {
            invoice: editingInvoice.invoice_id,
            item: line.item_id || null,
            description: line.description || '',
            qty: line.qty || 0,
            rate: line.rate || 0,
            amount: line.amount || 0,
          });
        }
        
        toast.success('Invoice updated successfully');
      } else {
        const response = await post('/invoices/', invoiceData);
        
        // Create invoice lines
        for (const line of lineItems) {
          await post('/invoice-lines/', {
            invoice: response.invoice_id,
            item: line.item_id || null,
            description: line.description || '',
            qty: line.qty || 0,
            rate: line.rate || 0,
            amount: line.amount || 0,
          });
        }
        
        toast.success('Invoice created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingInvoice(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      if (error.response?.data?.error && error.response.data.error.includes('already exists')) {
        toast.error(`Invoice number '${formData.invoice_no}' already exists. Please use a different number.`);
      } else {
        toast.error('Failed to save invoice');
      }
    }
  };

  const handleEdit = async (invoice: Invoice) => {
    console.log('Edit button clicked for invoice:', invoice);
    
    // Reset form first to ensure clean state
    resetForm();
    
    // Set the specific invoice being edited
    setEditingInvoice(invoice);
    setFormData({
      customer_id: invoice.customer_id.toString(),
      invoice_no: invoice.invoice_no,
      invoice_date: invoice.invoice_date,
      memo: invoice.memo,
    });
    
    // Load existing invoice lines for this specific invoice only
    try {
      const response = await get(`/invoice-lines/?invoice=${invoice.invoice_id}`);
      const existingLines = response.results || response;
      
      // Convert existing lines to our format
      const formattedLines = existingLines.map((line: any) => ({
        invoice_line_id: line.invoice_line_id,
        invoice_id: line.invoice_id,
        item_id: line.item_id || null,
        item_name: line.item_name || '',
        description: line.description || '',
        qty: line.qty || 0,
        rate: line.rate || 0,
        amount: Number(line.amount) || 0,
      }));
      
      setLineItems(formattedLines);
    } catch (error) {
      console.error('Error loading invoice lines:', error);
      setLineItems([]);
    }
    
    // Open dialog for this specific invoice
    setIsDialogOpen(true);
  };

  const handleDelete = async (invoiceId: number) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        await del(`/invoices/${invoiceId}/`);
        toast.success('Invoice deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.error('Failed to delete invoice');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      invoice_no: '',
      invoice_date: new Date().toISOString().split('T')[0], // Today's date
      memo: '',
    });
    setLineItems([]);
    setEditingInvoice(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.memo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices (Accounts Receivable)</h1>
          <p className="text-gray-600 mt-1">Manage customer invoices and accounts receivable</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetForm();
          } else if (!editingInvoice) {
            // Auto-generate invoice number immediately when opening for new invoice
            fetchNextInvoiceNumber();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => { 
              setEditingInvoice(null); 
              setLineItems([]);
              // Auto-generate invoice number when button is clicked
              fetchNextInvoiceNumber();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? `Edit Invoice #${editingInvoice.invoice_no}` : 'Add New Invoice'}
              </DialogTitle>
              <DialogDescription>
                {editingInvoice ? `Update information for invoice #${editingInvoice.invoice_no}` : 'Create a new customer invoice. Invoice number will be auto-generated but can be customized.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              {editingInvoice && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Edit className="h-4 w-4" />
                    <span className="font-medium">Editing Invoice #{editingInvoice.invoice_no}</span>
                    <span className="text-sm text-blue-600">
                      ({editingInvoice.customer_name || 'Unknown Customer'})
                    </span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-6 py-4">
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
                      {customers.map((customer) => (
                        <SelectItem key={customer.customer_id} value={customer.customer_id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_no">Invoice Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invoice_no"
                      value={formData.invoice_no}
                      onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                      placeholder="Auto-generated"
                      className="h-12"
                    />
                    {!editingInvoice && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fetchNextInvoiceNumber}
                        className="h-12 px-3"
                        title="Get next auto-generated number"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_date">Invoice Date *</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">Memo</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Additional notes about the invoice"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              {/* Invoice Lines */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Invoice Lines</Label>
                  <Button type="button" variant="outline" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {lineItems.map((line, index) => (
                    <Card key={index} className="p-6">
                      <div className="space-y-4">
                        {/* First Row: Item List */}
                        <div className="space-y-2">
                          <Label>Item List</Label>
                          <Select
                            value={line.item_id?.toString() || ''}
                            onValueChange={(value) => updateLineItem(index, 'item_id', parseInt(value))}
                          >
                            <SelectTrigger className="h-12 w-full">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((item) => {
                                const correctStock = calculateCorrectStockKg(item);
                                const stockDisplay = correctStock < 0 ? 'Out of Stock' : `${correctStock} kg`;
                                return (
                                  <SelectItem key={item.item_id} value={item.item_id.toString()}>
                                    {item.name} - Stock: {stockDisplay}
                                    {item.selling_price && ` - $${item.selling_price}/${item.uom}`}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Second Row: Description */}
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={line.description || ''}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            placeholder="Description"
                            className="h-12 w-full"
                          />
                        </div>
                        
                        {/* Third Row: Quantity, Rate, Amount, and Actions */}
                        <div className="grid grid-cols-4 gap-4 items-end">
                          <div className="space-y-2">
                            <Label>QTY</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.qty && line.qty > 0 ? line.qty : ''}
                              onChange={(e) => updateLineItem(index, 'qty', parseFloat(e.target.value) || 0)}
                              placeholder="Quantity"
                              className="h-12 w-full"
                            />
                            {/* {line.quantity && line.quantity > 0 && line.item_id && (
                              <div className={`text-xs p-2 rounded ${
                                checkStockAvailability(line.item_id, line.quantity).available 
                                  ? 'bg-green-50 text-green-700' 
                                  : 'bg-red-50 text-red-700'
                              }`}>
                                {checkStockAvailability(line.item_id, line.quantity).message}
                              </div>
                            )} */}
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Rate per Unit</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.rate && line.rate > 0 ? line.rate : ''}
                              onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                              placeholder="Rate per unit"
                              className="h-12 w-full"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.amount || 0}
                              readOnly
                              className="bg-gray-50 h-12 w-full"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Actions</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                              className="text-red-600 hover:text-red-700 h-12 px-3 w-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 text-center">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ${Number(calculateTotals().totalAmount || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-purple-600">Total Amount</div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingInvoice ? `Update Invoice #${editingInvoice.invoice_no}` : 'Create Invoice'}
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
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoices...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Open Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.invoice_id}>
                  <TableCell className="font-medium">{invoice.invoice_no}</TableCell>
                  <TableCell>{invoice.customer_name}</TableCell>
                  <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                  <TableCell>${Number(invoice.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell className="font-medium">${Number(invoice.open_balance || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(invoice)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Details button clicked for invoice:', invoice.invoice_id);
                          if (showInvoiceLines === invoice.invoice_id) {
                            setShowInvoiceLines(null);
                            setSelectedInvoice(null);
                            setCurrentInvoiceLines([]);
                          } else {
                            setShowInvoiceLines(invoice.invoice_id);
                            setSelectedInvoice(invoice);
                            fetchInvoiceLines(invoice.invoice_id);
                          }
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(invoice.invoice_id)}
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

      {/* Invoice Details Display */}
      {showInvoiceLines && selectedInvoice && (
        <div className="space-y-6">
          {/* Invoice Summary Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Invoice Details - #{selectedInvoice.invoice_no}
                  </CardTitle>
                  <CardDescription>
                    Complete information for this invoice
                  </CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-800">
                  ACCOUNTS RECEIVABLE
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Customer</p>
                  <p className="text-sm">{selectedInvoice.customer_name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Invoice Date</p>
                  <p className="text-sm">{selectedInvoice.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString() : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Due Date</p>
                  <p className="text-sm">{selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="text-sm font-semibold text-green-600">${selectedInvoice.total_amount ? Number(selectedInvoice.total_amount).toFixed(2) : '0.00'}</p>
                </div>
              </div>
              {selectedInvoice.memo && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-500 mb-2">Memo</p>
                  <p className="text-sm text-gray-700">{selectedInvoice.memo}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Lines Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Line Items
              </CardTitle>
              <CardDescription>
                Detailed breakdown of all line items
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentInvoiceLines.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentInvoiceLines.map((line) => (
                        <TableRow key={line.invoice_line_id}>
                          <TableCell className="font-medium">
                            {line.item_name || '-'}
                          </TableCell>
                          <TableCell>
                            {line.description || '-'}
                          </TableCell>
                          <TableCell>{line.qty || '-'}</TableCell>
                          <TableCell>{line.rate ? `$${Number(line.rate).toFixed(2)}` : '-'}</TableCell>
                          <TableCell className="font-medium text-right">
                            ${Number(line.amount || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Summary */}
                  <div className="flex justify-end pt-4 border-t">
                    <div className="text-right space-y-1">
                      <div className="text-sm text-gray-600">Total Amount</div>
                      <div className="text-xl font-bold text-green-600">
                        ${currentInvoiceLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No line items found for this invoice</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {filteredInvoices.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No invoices match your search criteria.' : 'Get started by creating your first invoice.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => {
              setEditingInvoice(null);
              setLineItems([]);
              setIsDialogOpen(true);
              fetchNextInvoiceNumber();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Invoice
            </Button>
          )}
        </div>
      )}

      {/* Total Accounts Receivable Summary */}
      {!loading && invoices.length > 0 && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Total Accounts Receivable</h3>
                  <p className="text-sm text-gray-600">Outstanding balance across all invoices</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">
                  ${invoices.reduce((sum, invoice) => sum + (Number(invoice.open_balance) || 0), 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  {invoices.filter(invoice => (Number(invoice.open_balance) || 0) > 0).length} invoices with outstanding balance
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}