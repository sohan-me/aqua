'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Receipt, Calendar, Clock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface PaymentTerm {
  terms_id: number;
  name: string;
  day_count: number;
  description: string;
  created_at: string;
}

export default function PaymentTermsPage() {
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    day_count: '',
    description: '',
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await get('/payment-terms/');
      setPaymentTerms(response.results || response || []);
    } catch (error) {
      console.error('Error fetching payment terms:', error);
      toast.error('Failed to fetch payment terms - API endpoint may not be available');
      setPaymentTerms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const termData = {
        ...formData,
        day_count: parseInt(formData.day_count),
      };
      
      console.log('Sending payment term data:', termData);

      if (editingTerm) {
        await put(`/payment-terms/${editingTerm.terms_id}/`, termData);
        toast.success('Payment term updated successfully');
      } else {
        await post('/payment-terms/', termData);
        toast.success('Payment term created successfully');
      }
      setIsDialogOpen(false);
      setEditingTerm(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving payment term:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to save payment term';
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const handleEdit = (term: PaymentTerm) => {
    setEditingTerm(term);
    setFormData({
      name: term.name,
      day_count: term.day_count.toString(),
      description: term.description,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (termsId: number) => {
    if (confirm('Are you sure you want to delete this payment term?')) {
      try {
        await del(`/payment-terms/${termsId}/`);
        toast.success('Payment term deleted successfully');
        fetchData();
    } catch (error: any) {
      console.error('Error deleting payment term:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to delete payment term';
      toast.error(`Error: ${errorMessage}`);
    }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      day_count: '',
      description: '',
    });
  };

  const filteredPaymentTerms = paymentTerms.filter(term =>
    term.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    term.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTermTypeColor = (dayCount: number) => {
    if (dayCount === 0) return 'bg-red-100 text-red-800';
    if (dayCount <= 15) return 'bg-yellow-100 text-yellow-800';
    if (dayCount <= 30) return 'bg-green-100 text-green-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getTermTypeLabel = (dayCount: number) => {
    if (dayCount === 0) return 'Due on Receipt';
    if (dayCount === 15) return 'Net 15';
    if (dayCount === 30) return 'Net 30';
    if (dayCount === 45) return 'Net 45';
    if (dayCount === 60) return 'Net 60';
    return `Net ${dayCount}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading payment terms...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Terms</h1>
          <p className="text-gray-600">Manage payment terms for vendors and customers</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Term
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Payment Terms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredPaymentTerms.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payment terms found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No payment terms match your search criteria.' : 'Get started by adding your first payment term.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Term
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term Name</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPaymentTerms.map((term) => (
                <TableRow key={term.terms_id}>
                  <TableCell className="font-medium">{term.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {term.day_count} days
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTermTypeColor(term.day_count)}>
                      {getTermTypeLabel(term.day_count)}
                    </Badge>
                  </TableCell>
                  <TableCell>{term.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(term.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(term)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(term.terms_id)}
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

      {/* Add/Edit Payment Term Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {editingTerm ? 'Edit Payment Term' : 'Add Payment Term'}
            </DialogTitle>
            <DialogDescription>
              {editingTerm ? 'Update the payment term details' : 'Create a new payment term for your business'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Term Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Net 30, Due on Receipt"
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="day_count">Days *</Label>
                <Input
                  id="day_count"
                  type="number"
                  min="0"
                  value={formData.day_count}
                  onChange={(e) => setFormData({ ...formData, day_count: e.target.value })}
                  placeholder="e.g., 30"
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this payment term..."
                  rows={3}
                />
              </div>
            </div>

            {/* Quick Templates */}
            <div className="py-4 border-t">
              <Label className="text-sm font-medium text-gray-600 mb-3 block">Quick Templates</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, name: 'Due on Receipt', day_count: '0', description: 'Payment due immediately upon receipt of invoice' })}
                >
                  Due on Receipt (0 days)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, name: 'Net 15', day_count: '15', description: 'Payment due within 15 days of invoice date' })}
                >
                  Net 15 (15 days)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, name: 'Net 30', day_count: '30', description: 'Payment due within 30 days of invoice date' })}
                >
                  Net 30 (30 days)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, name: 'Net 45', day_count: '45', description: 'Payment due within 45 days of invoice date' })}
                >
                  Net 45 (45 days)
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingTerm ? 'Update Payment Term' : 'Create Payment Term'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
