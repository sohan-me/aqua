'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, BookOpen, Calendar, DollarSign, FileText, Users, Building, CreditCard, TrendingUp, TrendingDown, Filter, SortAsc, SortDesc, ChevronDown, ChevronRight, Calculator, Banknote, Receipt, UserCheck } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface JournalEntry {
  journal_entry_id: number;
  entry_date: string;
  reference: string;
  memo: string;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted';
  created_at: string;
}

interface JournalEntryLine {
  jl_id: number;
  journal_entry: number;
  account: number;
  account_name?: string;
  debit: number;
  credit: number;
  memo: string;
  entry_type?: 'payable_clearing' | 'expense' | 'liability' | 'bank_payment' | 'other';
}

interface ChartAccount {
  account_id: number;
  code: string;
  name: string;
  account_type: string;
}

export default function JournalEntriesPage() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalLines, setJournalLines] = useState<{[key: number]: JournalEntryLine[]}>({});
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'reference'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'payable_clearing' | 'expense' | 'liability' | 'bank_payment'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [showJournalLines, setShowJournalLines] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    reference: '',
    memo: '',
    source: 'MANUAL',
  });
  const [lineItems, setLineItems] = useState<Partial<JournalEntryLine>[]>([]);

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [entriesResponse, accountsResponse] = await Promise.all([
        get('/journal-entries/'),
        get('/accounts/'),
      ]);
      
      setJournalEntries(entriesResponse.results || entriesResponse);
      setChartAccounts(accountsResponse.results || accountsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch journal entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchJournalLines = async (entryId: number) => {
    try {
      const response = await get(`/journal-lines/?journal_entry=${entryId}`);
      const lines = response.results || response;
      setJournalLines(prev => ({
        ...prev,
        [entryId]: lines
      }));
    } catch (error) {
      console.error('Error fetching journal lines:', error);
    }
  };


  const calculateTotals = () => {
    const totalDebit = lineItems.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lineItems.reduce((sum, line) => sum + (line.credit || 0), 0);
    return { totalDebit, totalCredit };
  };

  const formatCurrency = (value: string | number | undefined): string => {
    const num = parseFloat(String(value || '0'));
    return num.toFixed(2);
  };

  // Helper function to categorize journal lines
  const categorizeJournalLine = (line: JournalEntryLine): JournalEntryLine['entry_type'] => {
    const accountName = line.account_name?.toLowerCase() || '';
    const memo = line.memo?.toLowerCase() || '';
    
    if (memo.includes('clear employee payable') || accountName.includes('payable')) {
      return 'payable_clearing';
    } else if (accountName.includes('bank') || memo.includes('payment')) {
      return 'bank_payment';
    } else if (accountName.includes('expense') || accountName.includes('salary') || accountName.includes('overtime') || accountName.includes('bonus')) {
      return 'expense';
    } else if (accountName.includes('payable') || accountName.includes('liability') || accountName.includes('deduction') || accountName.includes('tax') || accountName.includes('pf')) {
      return 'liability';
    } else {
      return 'other';
    }
  };

  // Helper function to get entry type icon
  const getEntryTypeIcon = (entryType: JournalEntryLine['entry_type']) => {
    switch (entryType) {
      case 'payable_clearing':
        return <UserCheck className="h-4 w-4 text-blue-600" />;
      case 'expense':
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'liability':
        return <Building className="h-4 w-4 text-orange-600" />;
      case 'bank_payment':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      default:
        return <Receipt className="h-4 w-4 text-gray-600" />;
    }
  };

  // Helper function to get entry type color
  const getEntryTypeColor = (entryType: JournalEntryLine['entry_type']) => {
    switch (entryType) {
      case 'payable_clearing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'expense':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'liability':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'bank_payment':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // Helper function to group journal lines by type
  const groupJournalLinesByType = (lines: JournalEntryLine[]) => {
    const categorized = lines.map(line => ({
      ...line,
      entry_type: categorizeJournalLine(line)
    }));
    
    const grouped = {
      payable_clearing: categorized.filter(line => line.entry_type === 'payable_clearing'),
      expense: categorized.filter(line => line.entry_type === 'expense'),
      liability: categorized.filter(line => line.entry_type === 'liability'),
      bank_payment: categorized.filter(line => line.entry_type === 'bank_payment'),
      other: categorized.filter(line => line.entry_type === 'other')
    };
    
    return grouped;
  };

  // Helper function to calculate totals by type
  const calculateTotalsByType = (lines: JournalEntryLine[]) => {
    const grouped = groupJournalLinesByType(lines);
    const totals: {[key: string]: {debit: number, credit: number}} = {};
    
    Object.entries(grouped).forEach(([type, lines]) => {
      totals[type] = {
        debit: lines.reduce((sum, line) => sum + Number(line.debit ?? 0), 0),
        credit: lines.reduce((sum, line) => sum + Number(line.credit ?? 0), 0)
      };
    });
    
    return totals;
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      account: 0,
      debit: 0,
      credit: 0,
      memo: '',
    }]);
  };

  const updateLineItem = (index: number, field: keyof JournalEntryLine, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totals = calculateTotals();
      const entryData = {
        ...formData,
        reference: formData.reference || `JE-${Date.now()}`,
      };

      if (editingEntry) {
        await put(`/journal-entries/${editingEntry.journal_entry_id}/`, entryData);
        toast.success('Journal entry updated successfully');
      } else {
        const response = await post('/journal-entries/', entryData);
        
        // Create journal lines
        for (const line of lineItems) {
          await post('/journal-lines/', {
            account: line.account,
            debit: line.debit || 0,
            credit: line.credit || 0,
            memo: line.memo || '',
            journal_entry: response.journal_entry_id,
          });
        }
        
        toast.success('Journal entry created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingEntry(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast.error('Failed to save journal entry');
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.entry_date,
      reference: entry.reference,
      memo: entry.memo,
      source: 'MANUAL', // Default to MANUAL for editing
    });
    setLineItems([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (entryId: number) => {
    if (confirm('Are you sure you want to delete this journal entry?')) {
      try {
        await del(`/journal-entries/${entryId}/`);
        toast.success('Journal entry deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting journal entry:', error);
        toast.error('Failed to delete journal entry');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      reference: '',
      memo: '',
      source: 'MANUAL',
    });
    setLineItems([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'posted':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredJournalEntries = journalEntries
    .filter(entry =>
      entry.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.memo.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime();
          break;
        case 'amount':
          comparison = (a.total_debit + a.total_credit) - (b.total_debit + b.total_credit);
          break;
        case 'reference':
          comparison = a.reference.localeCompare(b.reference);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-gray-600 mt-1">Record manual journal entries and accounting transactions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingEntry(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Journal Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEntry ? 'Edit Journal Entry' : 'Add New Journal Entry'}</DialogTitle>
              <DialogDescription>
                {editingEntry ? 'Update journal entry information' : 'Create a new manual journal entry'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Entry Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                    placeholder="Journal entry reference"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) => setFormData({ ...formData, source: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manual Entry</SelectItem>
                      <SelectItem value="PAYROLL">Payroll</SelectItem>
                      <SelectItem value="BILL_PAYMENT">Bill Payment</SelectItem>
                      <SelectItem value="CUST_PAYMENT">Customer Payment</SelectItem>
                      <SelectItem value="INVOICE">Invoice</SelectItem>
                      <SelectItem value="DEPOSIT">Deposit</SelectItem>
                      <SelectItem value="TRANSFER">Transfer</SelectItem>
                      <SelectItem value="CHECK">Check</SelectItem>
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
                  placeholder="Additional notes about the journal entry"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              {/* Journal Lines */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Journal Lines</Label>
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
                          <Label>Account</Label>
                          <Select
                            value={line.account?.toString() || ''}
                            onValueChange={(value) => updateLineItem(index, 'account', parseInt(value))}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {chartAccounts.map((account) => (
                                <SelectItem key={account.account_id} value={account.account_id.toString()}>
                                  {account.code} - {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Debit Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.debit || ''}
                            onChange={(e) => updateLineItem(index, 'debit', parseFloat(e.target.value) || 0)}
                            placeholder="Debit amount"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Credit Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.credit || ''}
                            onChange={(e) => updateLineItem(index, 'credit', parseFloat(e.target.value) || 0)}
                            placeholder="Credit amount"
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
                          <Label>Actions</Label>
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
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      ${calculateTotals().totalDebit.toFixed(2)}
                    </div>
                    <div className="text-sm text-red-600">Total Debit</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${calculateTotals().totalCredit.toFixed(2)}
                    </div>
                    <div className="text-sm text-green-600">Total Credit</div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEntry ? 'Update' : 'Create'} Journal Entry
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced Search and Filter Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search journal entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="reference">Reference</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3"
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
          
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payable_clearing">Payable Clearing</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="liability">Liabilities</SelectItem>
              <SelectItem value="bank_payment">Bank Payments</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Journal Entries Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading journal entries...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Total Debit</TableHead>
                <TableHead>Total Credit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJournalEntries.map((entry) => (
                <React.Fragment key={entry.journal_entry_id}>
                  <TableRow>
                    <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{entry.reference}</TableCell>
                    <TableCell>${formatCurrency(entry.total_debit)}</TableCell>
                    <TableCell>${formatCurrency(entry.total_credit)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(entry.status)}>
                        {entry.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        onClick={() => {
                          if (showJournalLines === entry.journal_entry_id) {
                            setShowJournalLines(null);
                          } else {
                            setShowJournalLines(entry.journal_entry_id);
                            // Only fetch if we don't already have the lines
                            if (!journalLines[entry.journal_entry_id]) {
                              fetchJournalLines(entry.journal_entry_id);
                            }
                          }
                        }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(entry.journal_entry_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {showJournalLines === entry.journal_entry_id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-gray-50">
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-lg">Journal Lines</h4>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Calculator className="h-4 w-4" />
                              <span>Grouped by Type</span>
                            </div>
                          </div>
                          
                          {journalLines[entry.journal_entry_id] && journalLines[entry.journal_entry_id].length > 0 ? (
                            <div className="space-y-6">
                              {/* Summary Cards */}
                              {(() => {
                                const lines = journalLines[entry.journal_entry_id];
                                const totals = calculateTotalsByType(lines);
                                return (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    {Object.entries(totals).map(([type, total]) => {
                                      if (total.debit === 0 && total.credit === 0) return null;
                                      const typeLabels = {
                                        payable_clearing: 'Payable Clearing',
                                        expense: 'Expenses',
                                        liability: 'Liabilities',
                                        bank_payment: 'Bank Payments',
                                        other: 'Other'
                                      };
                                      return (
                                        <Card key={type} className="p-3">
                                          <div className="flex items-center space-x-2 mb-2">
                                            {getEntryTypeIcon(type as any)}
                                            <span className="text-sm font-medium text-gray-700">
                                              {typeLabels[type as keyof typeof typeLabels]}
                                            </span>
                                          </div>
                                          <div className="text-xs text-gray-600">
                                            <div>Debit: ${formatCurrency(total.debit)}</div>
                                            <div>Credit: ${formatCurrency(total.credit)}</div>
                                          </div>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                              
                              {/* Grouped Journal Lines */}
                              {(() => {
                                const lines = journalLines[entry.journal_entry_id];
                                const grouped = groupJournalLinesByType(lines);
                                const sectionTitles = {
                                  payable_clearing: { title: 'Employee Payable Clearing', icon: <UserCheck className="h-4 w-4" />, color: 'blue' },
                                  expense: { title: 'Expenses', icon: <TrendingUp className="h-4 w-4" />, color: 'red' },
                                  liability: { title: 'Liabilities & Deductions', icon: <Building className="h-4 w-4" />, color: 'orange' },
                                  bank_payment: { title: 'Bank Payments', icon: <CreditCard className="h-4 w-4" />, color: 'green' },
                                  other: { title: 'Other Entries', icon: <Receipt className="h-4 w-4" />, color: 'gray' }
                                };
                                
                                return Object.entries(grouped).map(([type, lines]) => {
                                  if (lines.length === 0) return null;
                                  const section = sectionTitles[type as keyof typeof sectionTitles];
                                  const colorClasses = {
                                    blue: 'bg-blue-50 border-blue-200',
                                    red: 'bg-red-50 border-red-200',
                                    orange: 'bg-orange-50 border-orange-200',
                                    green: 'bg-green-50 border-green-200',
                                    gray: 'bg-gray-50 border-gray-200'
                                  };
                                  
                                  return (
                                    <div key={type} className={`border rounded-lg ${colorClasses[section.color as keyof typeof colorClasses]}`}>
                                      <div className="flex items-center space-x-2 p-3 border-b border-current">
                                        <div className={`text-${section.color}-600`}>
                                          {section.icon}
                                        </div>
                                        <h5 className="font-semibold text-sm">{section.title}</h5>
                                        <span className="text-xs text-gray-600">({lines.length} entries)</span>
                                      </div>
                                      
                                      <div className="divide-y divide-current/20">
                                        {lines.map((line) => (
                                          <div key={line.jl_id} className="flex justify-between items-center py-3 px-4 hover:bg-white/50">
                                            <div className="flex-1">
                                              <div className="flex items-center space-x-2">
                                                {getEntryTypeIcon(line.entry_type || 'other')}
                                                <div className="text-sm">
                                                  <span className="font-medium text-gray-900">
                                                    {line.account_name || `Account ${line.account}`}
                                                  </span>
                                                  {line.memo && (
                                                    <span className="text-gray-600 ml-2">- {line.memo}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center space-x-6 text-right">
                                              <div className="w-24 text-sm">
                                                {Number(line.debit ?? 0) > 0 ? (
                                                  <span className="text-gray-900 font-medium">
                                                    ${formatCurrency(line.debit)}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </div>
                                              <div className="w-24 text-sm">
                                                {Number(line.credit ?? 0) > 0 ? (
                                                  <span className="text-gray-900 font-medium">
                                                    ${formatCurrency(line.credit)}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500 italic">No journal lines found for this entry.</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {filteredJournalEntries.length === 0 && !loading && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No journal entries found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No journal entries match your search criteria.' : 'Get started by creating your first journal entry.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Journal Entry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
