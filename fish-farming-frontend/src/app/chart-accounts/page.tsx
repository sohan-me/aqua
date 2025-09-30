'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Search, Edit, Trash2, BookOpen, ChevronRight, ChevronDown, Folder, FolderOpen, FileText, X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface Account {
  account_id: number;
  name: string;
  code: string;
  account_type: string;
  parent: number | null;
  parent_name?: string;
  description: string;
  active: boolean;
  level: number;
  children?: Account[];
  full_path?: string;
  balance?: number;
  formatted_balance?: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'deposit' | 'invoice' | 'payment' | 'transfer' | 'other';
}

const ACCOUNT_TYPES = [
  'Income',
  'Expense',
  'COGS',
  'Bank',
  'Credit Card',
  'Accounts Receivable',
  'Accounts Payable',
  'Other Current Asset',
  'Other Asset',
  'Other Current Liability',
  'Long Term Liability',
  'Equity',
  'Fixed Asset',
  'Other Income',
  'Other Expense',
];

export default function ChartAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<{[key: number]: {balance: number, formatted_balance: string}}>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    account_type: '',
    parent: '',
    description: '',
    active: true,
  });

  const { get, post, put, delete: del } = useApi();

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const [accountsResponse, balancesResponse] = await Promise.all([
        get('/accounts/tree/'),
        get('/accounts/balances/')
      ]);
      
      setAccounts(accountsResponse);
      
      // Convert balances array to object for easy lookup
      const balancesObj: {[key: number]: {balance: number, formatted_balance: string}} = {};
      balancesResponse.forEach((balance: any) => {
        balancesObj[balance.account_id] = {
          balance: balance.balance,
          formatted_balance: balance.formatted_balance
        };
      });
      setAccountBalances(balancesObj);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to fetch accounts';
      toast.error(`Error: ${errorMessage}`);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const fetchLedgerEntries = useCallback(async (account: Account) => {
    try {
      setLoadingLedger(true);
      setSelectedAccount(account);
      setIsLedgerOpen(true);
      
      const entries: LedgerEntry[] = [];
      
      if (account.account_type === 'Bank') {
        // Fetch deposits for this bank account
        const [depositsResponse, billPaymentsResponse, transfersResponse] = await Promise.all([
          get('/deposits/'),
          get('/bill-payments/'),
          get(`/journal-lines/?account=${account.account_id}&source=TRANSFER`),
        ]);
        const deposits = depositsResponse.results || depositsResponse;
        const billPayments = billPaymentsResponse.results || billPaymentsResponse;
        const transfers = transfersResponse.results || transfersResponse;
        
        deposits
          .filter((deposit: any) => deposit.bank_account === account.account_id)
          .forEach((deposit: any) => {
            entries.push({
              id: `deposit-${deposit.deposit_id}`,
              date: deposit.deposit_date,
              description: `Deposit - ${deposit.memo || 'No memo'}`,
              reference: deposit.reference || `DEP-${deposit.deposit_id}`,
              debit: parseFloat(deposit.total_amount || '0'),
              credit: 0,
              balance: parseFloat(deposit.total_amount || '0'),
              type: 'deposit'
            });
          });

        // Fetch bill payments for this bank account (show as Payment column)
        billPayments
          .filter((bp: any) => bp.payment_account === account.account_id)
          .forEach((bp: any) => {
            entries.push({
              id: `billpay-${bp.bill_payment_id}`,
              date: bp.payment_date,
              description: `Bill Payment - ${bp.payment_account_name || 'Bank'}`,
              reference: `BP-${bp.bill_payment_id}`,
              debit: 0,
              credit: parseFloat(bp.total_amount || '0'),
              balance: -parseFloat(bp.total_amount || '0'),
              type: 'payment'
            });
          });

        // Transfers affecting this account
        transfers.forEach((line: any) => {
          const isDebit = parseFloat(line.debit || '0') > 0;
          entries.push({
            id: `transfer-${line.journal_entry_id}-${line.jl_id || Math.random()}`,
            date: line.entry_date,
            description: isDebit ? 'Transfer In' : 'Transfer Out',
            reference: `TR-${line.journal_entry_id}`,
            debit: isDebit ? parseFloat(line.debit) : 0,
            credit: !isDebit ? parseFloat(line.credit) : 0,
            balance: isDebit ? parseFloat(line.debit) : -parseFloat(line.credit),
            type: 'transfer',
          });
        });
      } else if (account.account_type === 'Accounts Receivable') {
        // Fetch invoices for AR
        const invoicesResponse = await get('/invoices/');
        const invoices = invoicesResponse.results || invoicesResponse;
        
        invoices
          .filter((invoice: any) => invoice.open_balance > 0)
          .forEach((invoice: any) => {
            entries.push({
              id: `invoice-${invoice.invoice_id}`,
              date: invoice.invoice_date,
              description: `Invoice ${invoice.invoice_no} - ${invoice.customer_name}`,
              reference: invoice.invoice_no,
              debit: parseFloat(invoice.open_balance),
              credit: 0,
              balance: parseFloat(invoice.open_balance),
              type: 'invoice'
            });
          });
      } else if (account.account_type === 'Income') {
        // Fetch all invoices for income
        const invoicesResponse = await get('/invoices/');
        const invoices = invoicesResponse.results || invoicesResponse;
        
        invoices.forEach((invoice: any) => {
          entries.push({
            id: `income-${invoice.invoice_id}`,
            date: invoice.invoice_date,
            description: `Sales - Invoice ${invoice.invoice_no}`,
            reference: invoice.invoice_no,
            debit: 0,
            credit: parseFloat(invoice.total_amount),
            balance: parseFloat(invoice.total_amount),
            type: 'invoice'
          });
        });
      }
      
      // Sort entries by date (newest first)
      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setLedgerEntries(entries);
    } catch (error: any) {
      console.error('Error fetching ledger entries:', error);
      toast.error('Failed to fetch ledger entries');
      setLedgerEntries([]);
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        parent: formData.parent && formData.parent !== 'none' ? parseInt(formData.parent) : null,
      };

      if (editingAccount) {
        await put(`/accounts/${editingAccount.account_id}/`, submitData);
        toast.success('Account updated successfully');
      } else {
        await post('/accounts/', submitData);
        toast.success('Account created successfully');
      }
      setIsDialogOpen(false);
      setEditingAccount(null);
      resetForm();
      fetchAccounts();
    } catch (error) {
      console.error('Error saving account:', error);
      toast.error('Failed to save account');
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      code: account.code,
      account_type: account.account_type,
      parent: account.parent?.toString() || '',
      description: account.description,
      active: account.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (accountId: number) => {
    if (confirm('Are you sure you want to delete this account? This will also delete all sub-accounts.')) {
      try {
        await del(`/accounts/${accountId}/`);
        toast.success('Account deleted successfully');
        fetchAccounts();
      } catch (error) {
        console.error('Error deleting account:', error);
        toast.error('Failed to delete account');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      account_type: '',
      parent: '',
      description: '',
      active: true,
    });
  };

  const toggleNode = (accountId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedNodes(newExpanded);
  };

  const flattenAccounts = (accounts: Account[]): Account[] => {
    const flattened: Account[] = [];
    
    const flatten = (items: Account[]) => {
      items.forEach(item => {
        flattened.push(item);
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      });
    };
    
    flatten(accounts);
    return flattened;
  };

  const renderAccountTree = (accounts: Account[], level = 0) => {
    return accounts.map((account) => (
      <div key={account.account_id} className={`border-l-2 border-gray-100 ${level > 0 ? `ml-${Math.min(level * 4, 16)}` : ''}`}>
        <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
          <div className="flex items-center flex-1">
            {account.children && account.children.length > 0 ? (
              <button
                onClick={() => toggleNode(account.account_id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {expandedNodes.has(account.account_id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <div className="flex items-center space-x-2 flex-1">
              {/* Level indicator */}
              {level > 0 && (
                <div className="flex items-center space-x-1">
                  {Array.from({ length: level }, (_, i) => (
                    <div key={i} className="w-1 h-4 bg-gray-300 rounded"></div>
                  ))}
                </div>
              )}
              <Badge variant="outline" className="text-xs">
                {account.account_type}
              </Badge>
              <span className="font-mono text-sm text-gray-600">{account.code}</span>
              <span className={`font-medium ${level === 0 ? 'text-lg' : level === 1 ? 'text-base' : 'text-sm'}`}>
                {account.name}
              </span>
              {accountBalances[account.account_id] && (
                <span className="font-semibold text-green-600">
                  {accountBalances[account.account_id].formatted_balance}
                </span>
              )}
              {!account.active && (
                <Badge variant="secondary" className="text-xs">Inactive</Badge>
              )}
              {level > 0 && (
                <Badge variant="outline" className="text-xs">
                  Level {level + 1}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLedgerEntries(account)}
              className="text-blue-600 hover:text-blue-700"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(account)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(account.account_id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {account.children && account.children.length > 0 && expandedNodes.has(account.account_id) && (
          <div className={`${level > 0 ? `ml-${Math.min((level + 1) * 4, 16)}` : 'ml-4'}`}>
            {renderAccountTree(account.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.account_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chart of Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your accounting structure with hierarchical accounts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingAccount(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
              <DialogDescription>
                {editingAccount ? 'Update account information' : 'Create a new account in your chart of accounts'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Account name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Account Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., 1000, 1100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account_type">Account Type *</Label>
                  <Select
                    value={formData.account_type}
                    onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent">Parent Account</Label>
                  <Select
                    value={formData.parent}
                    onValueChange={(value) => setFormData({ ...formData, parent: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No parent (Root account)</SelectItem>
                      {flattenAccounts(accounts).map((account) => (
                        <SelectItem key={account.account_id} value={account.account_id.toString()}>
                          {account.full_path || `${account.code} - ${account.name}`}
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
                  placeholder="Account description"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAccount ? 'Update' : 'Create'} Account
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
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Accounts Tree */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading accounts...</p>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Account Structure</CardTitle>
            <CardDescription>
              Hierarchical view of your chart of accounts. Click arrows to expand/collapse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAccounts.length > 0 ? (
              <div className="space-y-1">
                {renderAccountTree(filteredAccounts)}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No accounts found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ledger Dialog */}
      <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ledger - {selectedAccount?.name} ({selectedAccount?.account_type})
            </DialogTitle>
            <DialogDescription>
              Transaction history for {selectedAccount?.name} account
            </DialogDescription>
          </DialogHeader>
          
          {loadingLedger ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading ledger entries...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{selectedAccount?.name}</h3>
                    <p className="text-sm text-gray-600">{selectedAccount?.account_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Current Balance</p>
                    <p className="text-2xl font-bold text-green-600">
                      {accountBalances[selectedAccount?.account_id || 0]?.formatted_balance || '$0.00'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              {ledgerEntries.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Description</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Reference</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Deposit</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Payment</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(entry.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                entry.type === 'deposit' ? 'bg-green-100 text-green-800' :
                                entry.type === 'invoice' ? 'bg-blue-100 text-blue-800' :
                                entry.type === 'payment' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.type.toUpperCase()}
                              </span>
                              <span>{entry.description}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                            {entry.reference}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                            ${entry.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No transactions found for this account</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLedgerOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
