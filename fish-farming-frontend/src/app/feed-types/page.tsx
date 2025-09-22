'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Package, Save, X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface FeedType {
  item_id: number;
  name: string;
  description: string;
  item_type: string;
  uom: string;
  protein_content?: number;
  feed_stage: string;
  cost_price?: number;
  selling_price?: number;
  is_feed: boolean;
  is_active: boolean;
  created_at: string;
}

export default function FeedTypesPage() {
  const { get, post, put, delete: del } = useApi();
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeedType, setEditingFeedType] = useState<FeedType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    item_type: 'inventory_part',
    uom: 'kg',
    protein_content: '',
    feed_stage: 'Starter',
    cost_price: '',
    selling_price: '',
    is_feed: true,
    is_active: true,
  });

  const feedStages = [
    'Starter',
    'Grower', 
    'Finisher',
    'Broodstock',
    'Fry',
    'Fingerling'
  ];

  const uomOptions = [
    'kg', 'g', 'lbs', 'tons', 'pcs', 'bags', 'packs'
  ];

  useEffect(() => {
    fetchFeedTypes();
  }, []);

  const fetchFeedTypes = async () => {
    try {
      setLoading(true);
      const response = await get('/items/');
      // Filter for feed items only
      const feedItems = response.results?.filter((item: any) => item.is_feed) || [];
      setFeedTypes(feedItems);
    } catch (error) {
      console.error('Error fetching feed types:', error);
      toast.error('Failed to fetch feed types');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        protein_content: formData.protein_content ? parseFloat(formData.protein_content) : null,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
      };

      if (editingFeedType) {
        await put(`/items/${editingFeedType.item_id}/`, submitData);
        toast.success('Feed type updated successfully');
      } else {
        await post('/items/', submitData);
        toast.success('Feed type created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingFeedType(null);
      resetForm();
      fetchFeedTypes();
    } catch (error) {
      console.error('Error saving feed type:', error);
      toast.error('Failed to save feed type');
    }
  };

  const handleEdit = (feedType: FeedType) => {
    setEditingFeedType(feedType);
    setFormData({
      name: feedType.name,
      description: feedType.description || '',
      item_type: feedType.item_type,
      uom: feedType.uom,
      protein_content: feedType.protein_content?.toString() || '',
      feed_stage: feedType.feed_stage || 'Starter',
      cost_price: feedType.cost_price?.toString() || '',
      selling_price: feedType.selling_price?.toString() || '',
      is_feed: feedType.is_feed,
      is_active: feedType.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this feed type?')) {
      try {
        await del(`/items/${id}/`);
        toast.success('Feed type deleted successfully');
        fetchFeedTypes();
      } catch (error) {
        console.error('Error deleting feed type:', error);
        toast.error('Failed to delete feed type');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      item_type: 'inventory_part',
      uom: 'kg',
      protein_content: '',
      feed_stage: 'Starter',
      cost_price: '',
      selling_price: '',
      is_feed: true,
      is_active: true,
    });
  };

  const openAddDialog = () => {
    setEditingFeedType(null);
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feed Types</h1>
          <p className="text-gray-600 mt-1">Manage fish feed types and specifications</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Feed Type
        </Button>
      </div>

      {/* Feed Types Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading feed types...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Protein %</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Cost Price (৳)</TableHead>
                <TableHead>Selling Price (৳)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No feed types found. Click "Add Feed Type" to create your first feed type.
                  </TableCell>
                </TableRow>
              ) : (
                feedTypes.map((feedType) => (
                  <TableRow key={feedType.item_id}>
                    <TableCell className="font-medium">{feedType.name}</TableCell>
                    <TableCell>{feedType.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{feedType.feed_stage || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{feedType.protein_content ? `${feedType.protein_content}%` : '-'}</TableCell>
                    <TableCell>{feedType.uom}</TableCell>
                    <TableCell>{feedType.cost_price ? `৳${Number(feedType.cost_price).toFixed(2)}` : '-'}</TableCell>
                    <TableCell>{feedType.selling_price ? `৳${Number(feedType.selling_price).toFixed(2)}` : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={feedType.is_active ? 'default' : 'secondary'}>
                        {feedType.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(feedType)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(feedType.item_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFeedType ? 'Edit Feed Type' : 'Add New Feed Type'}
            </DialogTitle>
            <DialogDescription>
              {editingFeedType ? 'Update the feed type information' : 'Create a new feed type for fish feeding'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Starter Feed, Grower Feed"
                  required
                />
              </div>
              <div>
                <Label htmlFor="uom">Unit of Measure *</Label>
                <Select
                  value={formData.uom}
                  onValueChange={(value) => setFormData({ ...formData, uom: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select UOM" />
                  </SelectTrigger>
                  <SelectContent>
                    {uomOptions.map((uom) => (
                      <SelectItem key={uom} value={uom}>{uom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Feed description and specifications"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="feed_stage">Feed Stage *</Label>
                <Select
                  value={formData.feed_stage}
                  onValueChange={(value) => setFormData({ ...formData, feed_stage: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {feedStages.map((stage) => (
                      <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="protein_content">Protein Content (%)</Label>
                <Input
                  id="protein_content"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.protein_content}
                  onChange={(e) => setFormData({ ...formData, protein_content: e.target.value })}
                  placeholder="e.g., 32.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cost_price">Cost Price (৳)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  placeholder="e.g., 125.50"
                />
              </div>
              <div>
                <Label htmlFor="selling_price">Selling Price (৳)</Label>
                <Input
                  id="selling_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  placeholder="e.g., 150.00"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                {editingFeedType ? 'Update' : 'Create'} Feed Type
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}