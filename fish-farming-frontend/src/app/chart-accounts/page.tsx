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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Search, Edit, Trash2, BookOpen, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    account_type: '',
    parent: '',
    description: '',
    active: true,
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await get('/accounts/tree/');
      setAccounts(response);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to fetch accounts';
      toast.error(`Error: ${errorMessage}`);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

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
    </div>
  );
}
