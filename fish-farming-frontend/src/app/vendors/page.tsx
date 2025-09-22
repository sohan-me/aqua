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
import { Plus, Search, Edit, Trash2, Truck, Tag } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface Vendor {
  vendor_id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  terms_default: number | null;
  terms_default_name?: string;
  memo: string;
  active: boolean;
  created_at: string;
  vendor_categories: Array<{
    vendor_category_id: number;
    name: string;
  }>;
}

interface VendorCategory {
  vendor_category_id: number;
  name: string;
  description: string;
  parent: number | null;
}

interface PaymentTerm {
  terms_id: number;
  name: string;
  day_count: number;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    terms_default: '',
    memo: '',
    active: true,
    vendor_categories: [] as number[],
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vendorsResponse, categoriesResponse, termsResponse] = await Promise.all([
        get('/vendors/'),
        get('/vendor-categories/'),
        get('/payment-terms/'),
      ]);
      
      setVendors(vendorsResponse.results || vendorsResponse);
      setVendorCategories(categoriesResponse.results || categoriesResponse);
      setPaymentTerms(termsResponse.results || termsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        terms_default: formData.terms_default && formData.terms_default !== 'none' ? parseInt(formData.terms_default) : null,
        vendor_categories: formData.vendor_categories,
      };
      
      console.log('Vendor form data being sent:', submitData);

      if (editingVendor) {
        await put(`/vendors/${editingVendor.vendor_id}/`, submitData);
        toast.success('Vendor updated successfully');
      } else {
        await post('/vendors/', submitData);
        toast.success('Vendor created successfully');
      }
      setIsDialogOpen(false);
      setEditingVendor(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast.error('Failed to save vendor');
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      contact_person: vendor.contact_person,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      terms_default: vendor.terms_default?.toString() || '',
      memo: vendor.memo,
      active: vendor.active,
      vendor_categories: vendor.vendor_categories?.map(vc => vc.vendor_category_id) || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (vendorId: number) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      try {
        await del(`/vendors/${vendorId}/`);
        toast.success('Vendor deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting vendor:', error);
        toast.error('Failed to delete vendor');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      terms_default: '',
      memo: '',
      active: true,
      vendor_categories: [],
    });
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600 mt-1">Manage your suppliers and service providers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingVendor(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
              <DialogDescription>
                {editingVendor ? 'Update vendor information' : 'Create a new vendor or supplier'}
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
                    placeholder="Vendor name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Contact person name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terms_default">Default Payment Terms</Label>
                  <Select
                    value={formData.terms_default}
                    onValueChange={(value) => setFormData({ ...formData, terms_default: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No default terms</SelectItem>
                      {paymentTerms.map((term) => (
                        <SelectItem key={term.terms_id} value={term.terms_id.toString()}>
                          {term.name} ({term.day_count} days)
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
                <Label htmlFor="vendor_categories">Categories</Label>
                <div className="grid grid-cols-2 gap-2">
                  {vendorCategories.map((category) => (
                    <label key={category.vendor_category_id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.vendor_categories.includes(category.vendor_category_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              vendor_categories: [...formData.vendor_categories, category.vendor_category_id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              vendor_categories: formData.vendor_categories.filter(id => id !== category.vendor_category_id)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">Notes</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Additional notes"
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingVendor ? 'Update' : 'Create'} Vendor
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
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Vendors List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading vendors...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.vendor_id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{vendor.name}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Truck className="h-4 w-4 mr-1" />
                      {vendor.terms_default_name || 'No default terms'}
                    </CardDescription>
                  </div>
                  <Badge variant={vendor.active ? 'default' : 'secondary'}>
                    {vendor.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {vendor.contact_person && (
                    <p className="text-sm text-gray-600">
                      <strong>Contact:</strong> {vendor.contact_person}
                    </p>
                  )}
                  {vendor.phone && (
                    <p className="text-sm text-gray-600">
                      <strong>Phone:</strong> {vendor.phone}
                    </p>
                  )}
                  {vendor.email && (
                    <p className="text-sm text-gray-600">
                      <strong>Email:</strong> {vendor.email}
                    </p>
                  )}
                  {vendor.address && (
                    <p className="text-sm text-gray-600">
                      <strong>Address:</strong> {vendor.address}
                    </p>
                  )}
                  {vendor.vendor_categories && vendor.vendor_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {vendor.vendor_categories.map((category) => (
                        <Badge key={category.vendor_category_id} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {vendor.memo && (
                    <p className="text-sm text-gray-600">
                      <strong>Notes:</strong> {vendor.memo}
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(vendor)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(vendor.vendor_id)}
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

      {filteredVendors.length === 0 && !loading && (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No vendors match your search criteria.' : 'Get started by adding your first vendor.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
