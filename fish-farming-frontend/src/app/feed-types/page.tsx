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
import { useFeedTypes, useCreateFeedType, useUpdateFeedType, useDeleteFeedType } from '@/hooks/useApi';
import { FeedType } from '@/lib/api';
import { toast } from 'sonner';

export default function FeedTypesPage() {
  const { data: feedTypesData, isLoading } = useFeedTypes();
  const createFeedType = useCreateFeedType();
  const updateFeedType = useUpdateFeedType();
  const deleteFeedType = useDeleteFeedType();
  console.log(feedTypesData?.data);
  const feedTypes = feedTypesData?.data?.results;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeedType, setEditingFeedType] = useState<FeedType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    protein_content: '',
  });



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        protein_content: formData.protein_content || null,
      };

      if (editingFeedType) {
        await updateFeedType.mutateAsync({ id: editingFeedType.id, data: submitData });
      } else {
        await createFeedType.mutateAsync(submitData);
      }
      
      setIsDialogOpen(false);
      setEditingFeedType(null);
      resetForm();
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
      protein_content: feedType.protein_content || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this feed type?')) {
      try {
        await deleteFeedType.mutateAsync(id);
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
      protein_content: '',
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
      {isLoading ? (
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
                <TableHead>Protein %</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedTypes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No feed types found. Click "Add Feed Type" to create your first feed type.
                  </TableCell>
                </TableRow>
              ) : (
                feedTypes?.map((feedType) => (
                  <TableRow key={feedType.id}>
                    <TableCell className="font-medium">{feedType.name}</TableCell>
                    <TableCell>{feedType.description || '-'}</TableCell>
                    <TableCell>{feedType.protein_content ? `${feedType.protein_content}%` : '-'}</TableCell>
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
                          onClick={() => handleDelete(feedType.id)}
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Feed description and specifications"
                rows={3}
              />
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