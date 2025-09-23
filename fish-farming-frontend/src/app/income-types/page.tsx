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
import { Plus, Search, Edit, Trash2, DollarSign, ChevronRight, ChevronDown } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface IncomeType {
  id: number;
  category: string;
  description: string;
  parent: number | null;
  parent_name?: string;
  full_path?: string;
  children?: IncomeType[];
  created_at: string;
}

export default function IncomeTypesPage() {
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncomeType, setEditingIncomeType] = useState<IncomeType | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    category: '',
    parent: '',
    description: '',
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchIncomeTypes();
  }, []);

  const fetchIncomeTypes = async () => {
    try {
      setLoading(true);
      const response = await get('/income-types/tree/');
      setIncomeTypes(response);
    } catch (error: any) {
      console.error('Error fetching income types:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to fetch income types';
      toast.error(`Error: ${errorMessage}`);
      setIncomeTypes([]);
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

      if (editingIncomeType) {
        await put(`/income-types/${editingIncomeType.id}/`, submitData);
        toast.success('Income category updated successfully');
      } else {
        await post('/income-types/', submitData);
        toast.success('Income category created successfully');
      }
      setIsDialogOpen(false);
      setEditingIncomeType(null);
      resetForm();
      fetchIncomeTypes();
    } catch (error) {
      console.error('Error saving income type:', error);
      toast.error('Failed to save income category');
    }
  };

  const handleEdit = (incomeType: IncomeType) => {
    setEditingIncomeType(incomeType);
    setFormData({
      category: incomeType.category,
      parent: incomeType.parent?.toString() || '',
      description: incomeType.description,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (incomeTypeId: number) => {
    if (confirm('Are you sure you want to delete this income category? This will also delete all sub-categories.')) {
      try {
        await del(`/income-types/${incomeTypeId}/`);
        toast.success('Income category deleted successfully');
        fetchIncomeTypes();
      } catch (error) {
        console.error('Error deleting income type:', error);
        toast.error('Failed to delete income category');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      parent: '',
      description: '',
    });
  };

  const toggleNode = (incomeTypeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(incomeTypeId)) {
      newExpanded.delete(incomeTypeId);
    } else {
      newExpanded.add(incomeTypeId);
    }
    setExpandedNodes(newExpanded);
  };

  const flattenIncomeTypes = (incomeTypes: IncomeType[]): IncomeType[] => {
    const flattened: IncomeType[] = [];
    
    const flatten = (items: IncomeType[]) => {
      items.forEach(item => {
        flattened.push(item);
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      });
    };
    
    flatten(incomeTypes);
    return flattened;
  };

  const renderIncomeTypeTree = (incomeTypes: IncomeType[], level = 0) => {
    return incomeTypes.map((incomeType) => (
      <div key={incomeType.id} className={`border-l-2 border-gray-100 ${level > 0 ? `ml-${Math.min(level * 4, 16)}` : ''}`}>
        <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
          <div className="flex items-center flex-1">
            {incomeType.children && incomeType.children.length > 0 ? (
              <button
                onClick={() => toggleNode(incomeType.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {expandedNodes.has(incomeType.id) ? (
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
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className={`font-medium ${level === 0 ? 'text-lg' : level === 1 ? 'text-base' : 'text-sm'}`}>
                {incomeType.category}
              </span>
              {incomeType.parent_name && (
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
              onClick={() => handleEdit(incomeType)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(incomeType.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {incomeType.children && incomeType.children.length > 0 && expandedNodes.has(incomeType.id) && (
          <div className={`${level > 0 ? `ml-${Math.min((level + 1) * 4, 16)}` : 'ml-4'}`}>
            {renderIncomeTypeTree(incomeType.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const filteredIncomeTypes = incomeTypes.filter(incomeType =>
    incomeType.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incomeType.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Income Categories</h1>
          <p className="text-gray-600 mt-1">Manage your income structure with hierarchical categories</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingIncomeType(null); resetForm(); }}>
          <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingIncomeType ? 'Edit Category' : 'Add New Category'}</DialogTitle>
              <DialogDescription>
                {editingIncomeType ? 'Update category information' : 'Create a new income category'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Category name"
                  required
                />
              </div>
                <div className="space-y-2">
                  <Label htmlFor="parent">Sub account of</Label>
                  <Select
                    value={formData.parent}
                    onValueChange={(value) => setFormData({ ...formData, parent: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No parent (Root category)</SelectItem>
                      {flattenIncomeTypes(incomeTypes).map((incomeType) => (
                        <SelectItem key={incomeType.id} value={incomeType.id.toString()}>
                          {incomeType.full_path || incomeType.category}
                        </SelectItem>
                      ))}
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
                  placeholder="Category description"
                rows={3}
              />
            </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
                </Button>
                <Button type="submit">
                  {editingIncomeType ? 'Update' : 'Create'} Category
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
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories Tree */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Category Structure</CardTitle>
            <CardDescription>
              Hierarchical view of your income categories. Click arrows to expand/collapse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredIncomeTypes.length > 0 ? (
              <div className="space-y-1">
                {renderIncomeTypeTree(filteredIncomeTypes)}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No categories found</p>
      </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
