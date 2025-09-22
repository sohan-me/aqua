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
import { Plus, Search, Edit, Trash2, Wallet, Calendar, DollarSign, Building } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface Deposit {
  deposit_id: number;
  bank_account_id: number;
  bank_account_name?: string;
  deposit_date: string;
  amount: number;
  reference: string;
  memo: string;
  created_at: string;
}

interface BankAccount {
  bank_account_id: number;
  account_name: string;
  bank_name: string;
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null);
  const [formData, setFormData] = useState({
    bank_account_id: '',
    deposit_date: '',
    amount: '',
    reference: '',
    memo: '',
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [depositsResponse, bankAccountsResponse] = await Promise.all([
        get('/deposits/'),
        get('/bank-accounts/'),
      ]);
      
      setDeposits(depositsResponse.results || depositsResponse);
      setBankAccounts(bankAccountsResponse.results || bankAccountsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch deposit data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const depositData = {
        ...formData,
        bank_account_id: parseInt(formData.bank_account_id),
        amount: parseFloat(formData.amount) || 0,
        reference: formData.reference || `DEP-${Date.now()}`,
      };

      if (editingDeposit) {
        await put(`/deposits/${editingDeposit.deposit_id}/`, depositData);
        toast.success('Deposit updated successfully');
      } else {
        await post('/deposits/', depositData);
        toast.success('Deposit created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingDeposit(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving deposit:', error);
      toast.error('Failed to save deposit');
    }
  };

  const handleEdit = (deposit: Deposit) => {
    setEditingDeposit(deposit);
    setFormData({
      bank_account_id: deposit.bank_account_id.toString(),
      deposit_date: deposit.deposit_date,
      amount: deposit.amount.toString(),
      reference: deposit.reference,
      memo: deposit.memo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (depositId: number) => {
    if (confirm('Are you sure you want to delete this deposit?')) {
      try {
        await del(`/deposits/${depositId}/`);
        toast.success('Deposit deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting deposit:', error);
        toast.error('Failed to delete deposit');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      bank_account_id: '',
      deposit_date: '',
      amount: '',
      reference: '',
      memo: '',
    });
  };

  const filteredDeposits = deposits.filter(deposit =>
    deposit.bank_account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deposit.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deposit.memo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deposits</h1>
          <p className="text-gray-600 mt-1">Record bank deposits and cash receipts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingDeposit(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Deposit
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDeposit ? 'Edit Deposit' : 'Add New Deposit'}</DialogTitle>
              <DialogDescription>
                {editingDeposit ? 'Update deposit information' : 'Record a new bank deposit'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_account_id">Bank Account *</Label>
                  <Select
                    value={formData.bank_account_id}
                    onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.bank_account_id} value={account.bank_account_id.toString()}>
                          {account.account_name} - {account.bank_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_date">Deposit Date *</Label>
                  <Input
                    id="deposit_date"
                    type="date"
                    value={formData.deposit_date}
                    onChange={(e) => setFormData({ ...formData, deposit_date: e.target.value })}
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
                    placeholder="Deposit amount"
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
                    placeholder="Deposit reference"
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
                  placeholder="Additional notes about the deposit"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingDeposit ? 'Update' : 'Create'} Deposit
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
            placeholder="Search deposits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Deposits Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading deposits...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Account</TableHead>
                <TableHead>Deposit Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeposits.map((deposit) => (
                <TableRow key={deposit.deposit_id}>
                  <TableCell className="font-medium">{deposit.bank_account_name}</TableCell>
                  <TableCell>{new Date(deposit.deposit_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">${deposit.amount.toFixed(2)}</TableCell>
                  <TableCell>{deposit.reference}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(deposit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(deposit.deposit_id)}
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

      {filteredDeposits.length === 0 && !loading && (
        <div className="text-center py-12">
          <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No deposits found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No deposits match your search criteria.' : 'Get started by recording your first deposit.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Deposit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
