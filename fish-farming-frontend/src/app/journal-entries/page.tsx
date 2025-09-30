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
import { Plus, Search, Edit, Trash2, BookOpen, Calendar, DollarSign, FileText } from 'lucide-react';
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
}

interface ChartAccount {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: string;
}

export default function JournalEntriesPage() {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalLines, setJournalLines] = useState<JournalEntryLine[]>([]);
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [showJournalLines, setShowJournalLines] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    entry_date: '',
    reference: '',
    memo: '',
    status: 'draft',
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
        get('/chart-accounts/'),
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
      const response = await get(`/journal-entries/${entryId}/lines/`);
      setJournalLines(response.results || response);
    } catch (error) {
      console.error('Error fetching journal lines:', error);
    }
  };

  const calculateTotals = () => {
    const totalDebit = lineItems.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lineItems.reduce((sum, line) => sum + (line.credit || 0), 0);
    return { totalDebit, totalCredit };
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
        total_debit: totals.totalDebit,
        total_credit: totals.totalCredit,
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
      entry_date: entry.entry_date,
      reference: entry.reference,
      memo: entry.memo,
      status: entry.status,
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
      entry_date: '',
      reference: '',
      memo: '',
      status: 'draft',
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

  const filteredJournalEntries = journalEntries.filter(entry =>
    entry.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.memo.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <Label htmlFor="entry_date">Entry Date *</Label>
                  <Input
                    id="entry_date"
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
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
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="posted">Posted</SelectItem>
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
                                  {account.account_code} - {account.account_name}
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

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search journal entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
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
                <TableRow key={entry.journal_entry_id}>
                  <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{entry.reference}</TableCell>
                  <TableCell>${entry.total_debit.toFixed(2)}</TableCell>
                  <TableCell>${entry.total_credit.toFixed(2)}</TableCell>
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
                            fetchJournalLines(entry.journal_entry_id);
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
