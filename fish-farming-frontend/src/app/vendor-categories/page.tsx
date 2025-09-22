'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, Building2, Tag, ChevronRight, ChevronDown } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface VendorCategory {
  vendor_category_id: number;
  name: string;
  description: string;
  parent?: number;
  parent_name?: string;
  children_count?: number;
  created_at: string;
}

export default function VendorCategoriesPage() {
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VendorCategory | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent: '',
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await get('/vendor-categories/');
      setVendorCategories(response.results || response || []);
    } catch (error) {
      console.error('Error fetching vendor categories:', error);
      toast.error('Failed to fetch vendor categories - API endpoint may not be available');
      setVendorCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const categoryData = {
        ...formData,
        parent: formData.parent ? parseInt(formData.parent) : null,
      };
      
      console.log('Sending vendor category data:', categoryData);

      if (editingCategory) {
        await put(`/vendor-categories/${editingCategory.vendor_category_id}/`, categoryData);
        toast.success('Vendor category updated successfully');
      } else {
        await post('/vendor-categories/', categoryData);
        toast.success('Vendor category created successfully');
      }
      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving vendor category:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to save vendor category';
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const handleEdit = (category: VendorCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      parent: category.parent?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoryId: number) => {
    if (confirm('Are you sure you want to delete this vendor category?')) {
      try {
        await del(`/vendor-categories/${categoryId}/`);
        toast.success('Vendor category deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting vendor category:', error);
        toast.error('Failed to delete vendor category');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parent: '',
    });
  };

  const toggleExpanded = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredCategories = vendorCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRootCategories = () => {
    return filteredCategories.filter(cat => !cat.parent);
  };

  const getChildCategories = (parentId: number) => {
    return filteredCategories.filter(cat => cat.parent === parentId);
  };

  const renderCategoryRow = (category: VendorCategory, level: number = 0) => {
    const hasChildren = getChildCategories(category.vendor_category_id).length > 0;
    const isExpanded = expandedCategories.has(category.vendor_category_id);

    return (
      <React.Fragment key={category.vendor_category_id}>
        <TableRow>
          <TableCell style={{ paddingLeft: `${level * 20 + 12}px` }}>
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(category.vendor_category_id)}
                  className="h-6 w-6 p-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <div className="w-6" />
              )}
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{category.name}</span>
            </div>
          </TableCell>
          <TableCell>
            <div className="max-w-xs truncate">{category.description}</div>
          </TableCell>
          <TableCell>
            {category.parent_name ? (
              <Badge variant="outline">{category.parent_name}</Badge>
            ) : (
              <Badge variant="default">Root Category</Badge>
            )}
          </TableCell>
          <TableCell>
            {category.children_count || 0} subcategories
          </TableCell>
          <TableCell>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(category)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(category.vendor_category_id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && (
          <>
            {getChildCategories(category.vendor_category_id).map(child =>
              renderCategoryRow(child, level + 1)
            )}
          </>
        )}
      </React.Fragment>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading vendor categories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Categories</h1>
          <p className="text-gray-600">Organize vendors into hierarchical categories</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Vendor Categories
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

      {filteredCategories.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vendor categories found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No vendor categories match your search criteria.' : 'Get started by adding your first vendor category.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor Category
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Subcategories</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getRootCategories().map(category => renderCategoryRow(category))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Category Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editingCategory ? 'Edit Vendor Category' : 'Add Vendor Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the vendor category details' : 'Create a new vendor category for organizing vendors'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Feed Suppliers, Equipment Vendors"
                  className="h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Category</Label>
                <select
                  id="parent"
                  value={formData.parent}
                  onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">No parent (Root category)</option>
                  {vendorCategories.map((category) => (
                    <option key={category.vendor_category_id} value={category.vendor_category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this vendor category..."
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
                  onClick={() => setFormData({ ...formData, name: 'Feed Suppliers', description: 'Vendors specializing in fish feed and nutrition products' })}
                >
                  Feed Suppliers
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, name: 'Equipment Vendors', description: 'Suppliers of aquaculture equipment and machinery' })}
                >
                  Equipment Vendors
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, name: 'Medicine Suppliers', description: 'Vendors providing fish health and medicine products' })}
                >
                  Medicine Suppliers
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, name: 'Service Providers', description: 'Companies providing aquaculture services' })}
                >
                  Service Providers
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCategory ? 'Update Category' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
