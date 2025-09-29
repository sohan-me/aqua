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
import { Plus, Search, Edit, Trash2, Banknote, Calendar, DollarSign, Building } from 'lucide-react';
import { useApi, useVendors } from '@/hooks/useApi';
import { extractApiData } from '@/lib/utils';
import { toast } from 'sonner';

interface BillPayment {
  bill_payment_id: number;
  vendor_id?: number;
  vendor_name?: string;
  bill_id?: number | null;
  bill_number?: string;
  payment_date: string;
  total_amount: string;  // API returns as string
  reference?: string;
  memo: string;
  payment_account?: number;
  payment_account_name?: string;
  account_id?: number;
  created_at: string;
}

interface Vendor {
  vendor_id: number;
  name: string;
}

interface Bill {
  bill_id: number;
  bill_no: string;
  bill_number: string;
  vendor: number;  // This is the actual field name from API
  vendor_id?: number;  // Keep for backward compatibility
  vendor_name?: string;
  bill_date: string;
  due_date: string;
  total_amount: string;  // API returns as string
  paid_amount: string;   // API returns as string
  open_balance: string;  // API returns as string
  balance_amount: string; // API returns as string
  status: string;
  memo: string;
}

interface Account {
  account_id: number;
  name: string;
  code: string;
  account_type: string;
  parent?: number;
  children?: Account[];
}


export default function BillPaymentsPage() {
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<BillPayment | null>(null);
  const [formData, setFormData] = useState({
    vendor_id: '',
    bill_id: 'none',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    reference: '',
    memo: '',
    account_id: '',  // New field for account selection
  });

  const { get, post, put, delete: del } = useApi();
  const { data: vendorsData, isLoading: vendorsLoading } = useVendors();
  
  // Extract vendors data using the utility function
  const vendors = extractApiData<Vendor>(vendorsData?.data);
  
  // Debug logging
  console.log('Vendors data:', vendorsData);
  console.log('Extracted vendors:', vendors);
  console.log('Vendors loading:', vendorsLoading);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsResponse, billsResponse, accountsResponse] = await Promise.all([
        get('/bill-payments/'),
        get('/bills/'),
        get('/accounts/tree/'),
      ]);
      
      setPayments(paymentsResponse.results || paymentsResponse);
      setBills(billsResponse.results || billsResponse);
      setAccounts(accountsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const paymentData = {
        ...formData,
        bill_id: formData.bill_id && formData.bill_id !== 'none' ? parseInt(formData.bill_id) : null,
        total_amount: parseFloat(formData.amount) || 0,
        reference: formData.reference || `PAY-${Date.now()}`,
        payment_account: formData.account_id ? parseInt(formData.account_id) : null,
      };

      if (editingPayment) {
        await put(`/bill-payments/${editingPayment.bill_payment_id}/`, paymentData);
        toast.success('Bill payment updated successfully');
      } else {
        await post('/bill-payments/', paymentData);
        toast.success('Bill payment created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingPayment(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving bill payment:', error);
      toast.error('Failed to save bill payment');
    }
  };

  const handleEdit = (payment: BillPayment) => {
    setEditingPayment(payment);
    setFormData({
      vendor_id: payment.vendor_id?.toString() || '',
      bill_id: payment.bill_id?.toString() || 'none',
      payment_date: payment.payment_date,
      amount: payment.total_amount,
      reference: payment.reference || '',
      memo: payment.memo,
      account_id: payment.payment_account?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (paymentId: number) => {
    if (confirm('Are you sure you want to delete this bill payment?')) {
      try {
        await del(`/bill-payments/${paymentId}/`);
        toast.success('Bill payment deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting bill payment:', error);
        toast.error('Failed to delete bill payment');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_id: '',
      bill_id: 'none',
      payment_date: new Date().toISOString().split('T')[0],
      amount: '',
      reference: '',
      memo: '',
      account_id: '',
    });
  };

  // Helper function to flatten accounts tree
  const flattenAccounts = (accounts: Account[]): Account[] => {
    const flattened: Account[] = [];
    
    const flatten = (account: Account) => {
      flattened.push(account);
      if (account.children && account.children.length > 0) {
        account.children.forEach((child: Account) => flatten(child));
      }
    };
    
    accounts.forEach(account => flatten(account));
    return flattened;
  };

  const getFilteredBills = () => {
    console.log('getFilteredBills called with vendor_id:', formData.vendor_id);
    console.log('All bills:', bills);
    
    if (!formData.vendor_id) {
      console.log('No vendor selected, returning empty array');
      return [];
    }
    
    const filtered = bills.filter(bill => 
      bill.vendor === Number(formData.vendor_id) && 
      parseFloat(bill.open_balance) > 0
    );
    
    console.log('Filtered bills for vendor', formData.vendor_id, ':', filtered);
    return filtered;
  };

  const filteredPayments = payments.filter(payment =>
    payment.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.memo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bill Payments</h1>
          <p className="text-gray-600 mt-1">Record and manage vendor bill payments</p>
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
              <DialogTitle>{editingPayment ? 'Edit Bill Payment' : 'Add New Bill Payment'}</DialogTitle>
              <DialogDescription>
                {editingPayment ? 'Update bill payment information' : 'Record a new vendor bill payment'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor_id">Vendor *</Label>
                  <Select
                    value={formData.vendor_id}
                    onValueChange={(value) => setFormData({ ...formData, vendor_id: value, bill_id: 'none' })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorsLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading vendors...
                        </SelectItem>
                      ) : vendors.length === 0 ? (
                        <SelectItem value="no-vendors" disabled>
                          No vendors available
                        </SelectItem>
                      ) : (
                        vendors.map((vendor) => (
                          <SelectItem key={vendor.vendor_id} value={vendor.vendor_id.toString()}>
                            {vendor.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bill_id">Bill</Label>
                  <Select
                    value={formData.bill_id}
                    onValueChange={(value) => setFormData({ ...formData, bill_id: value })}
                    disabled={!formData.vendor_id}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select bill (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No bill</SelectItem>
                      {getFilteredBills().length > 0 ? (
                        getFilteredBills().map((bill) => (
                          <SelectItem key={bill.bill_id} value={String(bill.bill_id)}>
                            {bill.bill_no} - ${(parseFloat(bill.open_balance) || 0).toFixed(2)} (Due: {new Date(bill.due_date).toLocaleDateString()})
                          </SelectItem>
                        ))
                      ) : (
                        formData.vendor_id && (
                          <SelectItem value="no-bills" disabled>
                            No outstanding bills for this vendor
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Payment amount"
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_id">Account *</Label>
                  <Select
                    value={formData.account_id}
                    onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <SelectItem value="loading" disabled>
                          Loading accounts...
                        </SelectItem>
                      ) : flattenAccounts(accounts).length > 0 ? (
                        flattenAccounts(accounts).map((account) => (
                          <SelectItem key={account.account_id} value={account.account_id.toString()}>
                            {account.code} - {account.name} ({account.account_type})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-accounts" disabled>
                          No accounts available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Payment reference"
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
                  placeholder="Additional notes about the payment"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

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
                <TableHead>Vendor</TableHead>
                <TableHead>Bill</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.bill_payment_id}>
                  <TableCell className="font-medium">{payment.vendor_name}</TableCell>
                  <TableCell>{payment.bill_number || '-'}</TableCell>
                  <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">${(parseFloat(payment.total_amount) || 0).toFixed(2)}</TableCell>
                  <TableCell>{payment.reference}</TableCell>
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
                        onClick={() => handleDelete(payment.bill_payment_id)}
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
          <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No payments match your search criteria.' : 'Get started by recording your first bill payment.'}
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
