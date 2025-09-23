'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Receipt } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface PaymentTerms {
  terms_id: number;
  name: string;
  day_count: number;
  description: string;
  created_at: string;
}

export default function PaymentTermsPage() {
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPaymentTerms, setEditingPaymentTerms] = useState<PaymentTerms | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    day_count: '',
    description: '',
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchPaymentTerms();
  }, []);

  const fetchPaymentTerms = async () => {
    try {
      setLoading(true);
      const response = await get('/payment-terms/');
      setPaymentTerms(response.results || response);
    } catch (error) {
      console.error('Error fetching payment terms:', error);
      toast.error('Failed to fetch payment terms');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        day_count: parseInt(formData.day_count),
      };

      if (editingPaymentTerms) {
        await put(`/payment-terms/${editingPaymentTerms.terms_id}/`, submitData);
        toast.success('Payment terms updated successfully');
      } else {
        await post('/payment-terms/', submitData);
        toast.success('Payment terms created successfully');
      }
      setIsDialogOpen(false);
      setEditingPaymentTerms(null);
      resetForm();
      fetchPaymentTerms();
    } catch (error) {
      console.error('Error saving payment terms:', error);
      toast.error('Failed to save payment terms');
    }
  };

  const handleEdit = (paymentTerms: PaymentTerms) => {
    setEditingPaymentTerms(paymentTerms);
    setFormData({
      name: paymentTerms.name,
      day_count: paymentTerms.day_count.toString(),
      description: paymentTerms.description,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (termsId: number) => {
    if (confirm('Are you sure you want to delete these payment terms?')) {
      try {
        await del(`/payment-terms/${termsId}/`);
        toast.success('Payment terms deleted successfully');
        fetchPaymentTerms();
      } catch (error) {
        console.error('Error deleting payment terms:', error);
        toast.error('Failed to delete payment terms');
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

  const filteredPaymentTerms = paymentTerms.filter(terms =>
    terms.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    terms.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Terms</h1>
          <p className="text-gray-600 mt-1">Manage payment terms for bills and invoices</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingPaymentTerms(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Terms
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPaymentTerms ? 'Edit Payment Terms' : 'Add New Payment Terms'}</DialogTitle>
              <DialogDescription>
                {editingPaymentTerms ? 'Update payment terms information' : 'Create new payment terms for bills and invoices'}
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
                    placeholder="e.g., Net 30, Due on receipt"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="day_count">Days *</Label>
                  <Input
                    id="day_count"
                    type="number"
                    value={formData.day_count}
                    onChange={(e) => setFormData({ ...formData, day_count: e.target.value })}
                    placeholder="Number of days"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Payment terms description"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPaymentTerms ? 'Update' : 'Create'} Payment Terms
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
            placeholder="Search payment terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Payment Terms List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payment terms...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPaymentTerms.map((terms) => (
            <Card key={terms.terms_id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{terms.name}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Receipt className="h-4 w-4 mr-1" />
                      {terms.day_count} days
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {terms.day_count === 0 ? 'Due on receipt' : `${terms.day_count} days`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {terms.description && (
                    <p className="text-sm text-gray-600">
                      <strong>Description:</strong> {terms.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    <strong>Created:</strong> {new Date(terms.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(terms)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(terms.terms_id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredPaymentTerms.length === 0 && !loading && (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payment terms found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No payment terms match your search criteria.' : 'Get started by adding your first payment terms.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Terms
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
