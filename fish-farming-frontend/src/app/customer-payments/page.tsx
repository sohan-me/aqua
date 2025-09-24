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
import { Plus, Search, Edit, Trash2, Wallet, Calendar, DollarSign, User } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface CustomerPayment {
  cust_payment_id: number;
  customer_id: number;
  customer_name?: string;
  payment_date: string;
  amount_total: number;
  memo: string;
  deposit_account: number;
  created_at: string;
  updated_at: string;
}

interface Customer {
  customer_id: number;
  name: string;
}

interface Invoice {
  invoice_id: number;
  invoice_no: string;
  customer_id: number;
  open_balance: number;
  invoice_date: string;
  total_amount: number;
  customer_name?: string;
}


export default function CustomerPaymentsPage() {
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<CustomerPayment | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    payment_date: '',
    amount_total: '',
    memo: '',
    deposit_account: '',
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsResponse, customersResponse, invoicesResponse] = await Promise.all([
        get('/customer-payments/'),
        get('/customers/'),
        get('/invoices/'),
      ]);
      
      setPayments(paymentsResponse.results || paymentsResponse);
      setCustomers(customersResponse.results || customersResponse);
      setInvoices(invoicesResponse.results || invoicesResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch payment data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerInvoices = async (customerId: string) => {
    if (!customerId) {
      setCustomerInvoices([]);
      return;
    }

    try {
      setLoadingInvoices(true);
      const response = await get(`/invoices/?customer=${customerId}`);
      const allInvoices = response.results || response;
      
      // Filter for invoices with outstanding balance
      const outstandingInvoices = allInvoices.filter((invoice: Invoice) => 
        invoice.open_balance > 0
      );
      
      setCustomerInvoices(outstandingInvoices);
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      toast.error('Failed to fetch customer invoices');
      setCustomerInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const paymentData = {
        ...formData,
        customer: parseInt(formData.customer_id),
        amount_total: parseFloat(formData.amount_total) || 0,
        deposit_account: parseInt(formData.deposit_account) || 1, // Default to first account
      };

      if (editingPayment) {
        await put(`/customer-payments/${editingPayment.cust_payment_id}/`, paymentData);
        toast.success('Customer payment updated successfully');
      } else {
        await post('/customer-payments/', paymentData);
        toast.success('Customer payment created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingPayment(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving customer payment:', error);
      toast.error('Failed to save customer payment');
    }
  };

  const handleEdit = (payment: CustomerPayment) => {
    setEditingPayment(payment);
    setFormData({
      customer_id: payment.customer_id.toString(),
      payment_date: payment.payment_date,
      amount_total: payment.amount_total.toString(),
      memo: payment.memo,
      deposit_account: payment.deposit_account.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (paymentId: number) => {
    if (confirm('Are you sure you want to delete this customer payment?')) {
      try {
        await del(`/customer-payments/${paymentId}/`);
        toast.success('Customer payment deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting customer payment:', error);
        toast.error('Failed to delete customer payment');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      payment_date: new Date().toISOString().split('T')[0], // Default to today
      amount_total: '',
      memo: '',
      deposit_account: '1', // Default to account ID 1
    });
    setCustomerInvoices([]);
  };


  const filteredPayments = payments.filter(payment =>
    payment.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.memo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Payments</h1>
          <p className="text-gray-600 mt-1">Record and manage customer payments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingPayment(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPayment ? 'Edit Customer Payment' : 'Add New Customer Payment'}</DialogTitle>
              <DialogDescription>
                {editingPayment ? 'Update customer payment information' : 'Record a new customer payment'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_id">Customer *</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, customer_id: value });
                      fetchCustomerInvoices(value);
                    }}
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
                  <Label htmlFor="deposit_account">Deposit Account</Label>
                  <Input
                    id="deposit_account"
                    type="number"
                    value={formData.deposit_account}
                    onChange={(e) => setFormData({ ...formData, deposit_account: e.target.value })}
                    placeholder="Account ID"
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_date">Payment Date *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount_total">Amount *</Label>
                  <Input
                    id="amount_total"
                    type="number"
                    step="0.01"
                    value={formData.amount_total}
                    onChange={(e) => setFormData({ ...formData, amount_total: e.target.value })}
                    placeholder="Payment amount"
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
                  placeholder="Additional notes about the payment"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              {/* Customer Outstanding Invoices */}
              {formData.customer_id && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Outstanding Invoices</h3>
                    {loadingInvoices && <div className="text-sm text-gray-500">Loading...</div>}
                  </div>
                  
                  {customerInvoices.length > 0 ? (
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Outstanding Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerInvoices.map((invoice) => (
                            <TableRow key={invoice.invoice_id}>
                              <TableCell className="font-medium">{invoice.invoice_no}</TableCell>
                              <TableCell>{new Date(invoice.invoice_date).toLocaleDateString()}</TableCell>
                              <TableCell>${Number(invoice.total_amount).toFixed(2)}</TableCell>
                              <TableCell className="text-red-600 font-medium">
                                ${Number(invoice.open_balance).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    !loadingInvoices && (
                      <div className="text-center py-4 text-gray-500">
                        <p>No outstanding invoices found for this customer.</p>
                      </div>
                    )
                  )}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPayment ? 'Update' : 'Create'} Payment
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
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payments...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.cust_payment_id}>
                  <TableCell className="font-medium">{payment.customer_name}</TableCell>
                  <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">${Number(payment.amount_total || 0).toFixed(2)}</TableCell>
                  <TableCell>{payment.memo || '-'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(payment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(payment.cust_payment_id)}
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

      {filteredPayments.length === 0 && !loading && (
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No payments match your search criteria.' : 'Get started by recording your first customer payment.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
