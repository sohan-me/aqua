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
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Customer {
  customer_id: number;
  name: string;
}

interface Item {
  item_id: number;
  name: string;
  item_type: string;
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
  const [formData, setFormData] = useState({
    customer_id: '',
    invoice_no: '',
    invoice_date: '',
    memo: '',
  });
  const [lineItems, setLineItems] = useState<Partial<InvoiceLine>[]>([]);

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

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
      const response = await get(`/invoice-lines/?invoice=${invoiceId}`);
      setInvoiceLines(response.results || response);
    } catch (error) {
      console.error('Error fetching invoice lines:', error);
    }
  };

  const calculateTotals = () => {
    const totalAmount = lineItems.reduce((sum, line) => sum + (line.total_price || 0), 0);
    return { totalAmount };
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      item_id: 0,
      quantity: 0,
      unit_price: 0,
      total_price: 0,
    }]);
  };

  const updateLineItem = (index: number, field: keyof InvoiceLine, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Calculate total price
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = updated[index].quantity || 0;
      const price = updated[index].unit_price || 0;
      updated[index].total_price = quantity * price;
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
        toast.success('Invoice updated successfully');
      } else {
        const response = await post('/invoices/', invoiceData);
        
        // Create invoice lines
        for (const line of lineItems) {
          await post('/invoice-lines/', {
            invoice: response.invoice_id,
            item: line.item_id || null,
            description: line.description || '',
            qty: line.quantity || 0,
            rate: line.unit_price || 0,
            amount: line.total_price || 0,
          });
        }
        
        toast.success('Invoice created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingInvoice(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      customer_id: invoice.customer_id.toString(),
      invoice_no: invoice.invoice_no,
      invoice_date: invoice.invoice_date,
      memo: invoice.memo,
    });
    setLineItems([]);
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
      invoice_date: '',
      memo: '',
    });
    setLineItems([]);
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingInvoice(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Add New Invoice'}</DialogTitle>
              <DialogDescription>
                {editingInvoice ? 'Update invoice information' : 'Create a new customer invoice'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
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
                  <Input
                    id="invoice_no"
                    value={formData.invoice_no}
                    onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                    placeholder="Invoice number"
                    className="h-12"
                  />
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
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.unit_price || ''}
                            onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            placeholder="Price per unit"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Total Price</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={line.total_price || 0}
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
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingInvoice ? 'Update' : 'Create'} Invoice
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
                          if (showInvoiceLines === invoice.invoice_id) {
                            setShowInvoiceLines(null);
                          } else {
                            setShowInvoiceLines(invoice.invoice_id);
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

      {filteredInvoices.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No invoices match your search criteria.' : 'Get started by creating your first invoice.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Invoice
            </Button>
          )}
        </div>
      )}
    </div>
  );
}