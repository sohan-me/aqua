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
import { Plus, Search, Edit, Trash2, CreditCard, Calendar, DollarSign, Building } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface Check {
  check_id: number;
  bank_account_id: number;
  bank_account_name?: string;
  check_number: string;
  check_date: string;
  amount: number;
  payee: string;
  memo: string;
  status: 'pending' | 'cleared' | 'void';
  created_at: string;
}

interface BankAccount {
  bank_account_id: number;
  account_name: string;
  bank_name: string;
}

export default function ChecksPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<Check | null>(null);
  const [formData, setFormData] = useState({
    bank_account_id: '',
    check_number: '',
    check_date: '',
    amount: '',
    payee: '',
    memo: '',
    status: 'pending',
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [checksResponse, bankAccountsResponse] = await Promise.all([
        get('/checks/'),
        get('/bank-accounts/'),
      ]);
      
      setChecks(checksResponse.results || checksResponse);
      setBankAccounts(bankAccountsResponse.results || bankAccountsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch check data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const checkData = {
        ...formData,
        bank_account_id: parseInt(formData.bank_account_id),
        amount: parseFloat(formData.amount) || 0,
        check_number: formData.check_number || `CHK-${Date.now()}`,
      };

      if (editingCheck) {
        await put(`/checks/${editingCheck.check_id}/`, checkData);
        toast.success('Check updated successfully');
      } else {
        await post('/checks/', checkData);
        toast.success('Check created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingCheck(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving check:', error);
      toast.error('Failed to save check');
    }
  };

  const handleEdit = (check: Check) => {
    setEditingCheck(check);
    setFormData({
      bank_account_id: check.bank_account_id.toString(),
      check_number: check.check_number,
      check_date: check.check_date,
      amount: check.amount.toString(),
      payee: check.payee,
      memo: check.memo,
      status: check.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (checkId: number) => {
    if (confirm('Are you sure you want to delete this check?')) {
      try {
        await del(`/checks/${checkId}/`);
        toast.success('Check deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting check:', error);
        toast.error('Failed to delete check');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      bank_account_id: '',
      check_number: '',
      check_date: '',
      amount: '',
      payee: '',
      memo: '',
      status: 'pending',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cleared':
        return 'bg-green-100 text-green-800';
      case 'void':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredChecks = checks.filter(check =>
    check.check_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    check.payee.toLowerCase().includes(searchTerm.toLowerCase()) ||
    check.bank_account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    check.memo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Checks</h1>
          <p className="text-gray-600 mt-1">Manage check payments and tracking</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingCheck(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Check
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCheck ? 'Edit Check' : 'Add New Check'}</DialogTitle>
              <DialogDescription>
                {editingCheck ? 'Update check information' : 'Record a new check payment'}
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
                  <Label htmlFor="check_number">Check Number</Label>
                  <Input
                    id="check_number"
                    value={formData.check_number}
                    onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                    placeholder="Check number"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="check_date">Check Date *</Label>
                  <Input
                    id="check_date"
                    type="date"
                    value={formData.check_date}
                    onChange={(e) => setFormData({ ...formData, check_date: e.target.value })}
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
                    placeholder="Check amount"
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payee">Payee *</Label>
                  <Input
                    id="payee"
                    value={formData.payee}
                    onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                    placeholder="Payee name"
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cleared">Cleared</SelectItem>
                      <SelectItem value="void">Void</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">Memo</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Additional notes about the check"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCheck ? 'Update' : 'Create'} Check
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
            placeholder="Search checks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Checks Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading checks...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Check Number</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead>Check Date</TableHead>
                <TableHead>Payee</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChecks.map((check) => (
                <TableRow key={check.check_id}>
                  <TableCell className="font-medium">{check.check_number}</TableCell>
                  <TableCell>{check.bank_account_name}</TableCell>
                  <TableCell>{new Date(check.check_date).toLocaleDateString()}</TableCell>
                  <TableCell>{check.payee}</TableCell>
                  <TableCell className="font-medium">${check.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(check.status)}>
                      {check.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(check)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(check.check_id)}
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

      {filteredChecks.length === 0 && !loading && (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No checks found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No checks match your search criteria.' : 'Get started by recording your first check.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Check
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
