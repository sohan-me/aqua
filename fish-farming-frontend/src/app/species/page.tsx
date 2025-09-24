'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSpeciesTree, useDeleteSpecies, useCreateSpecies, useUpdateSpecies } from '@/hooks/useApi';
import { Species } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Fish, Plus, Edit, Trash2, Search, BookOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function SpeciesPage() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpecies, setEditingSpecies] = useState<Species | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    scientific_name: '',
    parent: '',
  });

  const { data: speciesTreeData, isLoading } = useSpeciesTree();
  const deleteSpecies = useDeleteSpecies();
  const createSpecies = useCreateSpecies();
  const updateSpecies = useUpdateSpecies();

  useEffect(() => {
    if (speciesTreeData) {
      setSpecies(speciesTreeData.data || speciesTreeData);
      setLoading(false);
    }
  }, [speciesTreeData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        parent: formData.parent && formData.parent !== 'none' ? parseInt(formData.parent) : null,
      };

      if (editingSpecies) {
        await updateSpecies.mutateAsync({ id: editingSpecies.id, data: submitData });
        toast.success('Species updated successfully');
      } else {
        await createSpecies.mutateAsync(submitData);
        toast.success('Species created successfully');
      }
      setIsDialogOpen(false);
      setEditingSpecies(null);
      resetForm();
    } catch (error) {
      console.error('Error saving species:', error);
      toast.error('Failed to save species');
    }
  };

  const handleEdit = (species: Species) => {
    setEditingSpecies(species);
    setFormData({
      name: species.name,
      scientific_name: species.scientific_name,
      parent: species.parent?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete the species "${name}"? This action cannot be undone and will affect all related stocking records.`)) {
      try {
        await deleteSpecies.mutateAsync(id);
      } catch (error) {
        toast.error('Failed to delete species. It may be in use by existing stocking records.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      scientific_name: '',
      parent: '',
    });
  };

  const toggleNode = (speciesId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(speciesId)) {
      newExpanded.delete(speciesId);
    } else {
      newExpanded.add(speciesId);
    }
    setExpandedNodes(newExpanded);
  };

  const flattenSpecies = (species: Species[]): Species[] => {
    const flattened: Species[] = [];
    
    const flatten = (items: Species[]) => {
      items.forEach(item => {
        flattened.push(item);
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      });
    };
    
    flatten(species);
    return flattened;
  };

  const renderSpeciesTree = (species: Species[], level = 0) => {
    return species.map((spec) => (
      <div key={spec.id} className={`border-l-2 border-gray-100 ${level > 0 ? `ml-${Math.min(level * 4, 16)}` : ''}`}>
        <div className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
          <div className="flex items-center flex-1">
            {spec.children && spec.children.length > 0 ? (
              <button
                onClick={() => toggleNode(spec.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {expandedNodes.has(spec.id) ? (
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
                <Fish className="h-3 w-3 mr-1" />
                Species
              </Badge>
              <span className={`font-medium ${level === 0 ? 'text-lg' : level === 1 ? 'text-base' : 'text-sm'}`}>
                {spec.name}
              </span>
              {spec.scientific_name && (
                <span className="text-sm text-gray-600 italic">({spec.scientific_name})</span>
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
              onClick={() => handleEdit(spec)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(spec.id, spec.name)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {spec.children && spec.children.length > 0 && expandedNodes.has(spec.id) && (
          <div className={`${level > 0 ? `ml-${Math.min((level + 1) * 4, 16)}` : 'ml-4'}`}>
            {renderSpeciesTree(spec.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const filteredSpecies = species.filter(spec =>
    spec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (spec.scientific_name && spec.scientific_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fish Species</h1>
          <p className="text-gray-600 mt-1">Manage fish species with hierarchical organization</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingSpecies(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Species
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSpecies ? 'Edit Species' : 'Add New Species'}</DialogTitle>
              <DialogDescription>
                {editingSpecies ? 'Update species information' : 'Add a new fish species to your collection'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Species Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Tilapia"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scientific_name">Scientific Name</Label>
                  <Input
                    id="scientific_name"
                    value={formData.scientific_name}
                    onChange={(e) => setFormData({ ...formData, scientific_name: e.target.value })}
                    placeholder="e.g., Oreochromis niloticus"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="parent">Parent Species</Label>
                  <select
                    id="parent"
                    value={formData.parent}
                    onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">No parent (Root species)</option>
                    {flattenSpecies(species).map((spec) => (
                      <option key={spec.id} value={spec.id.toString()}>
                        {spec.full_path || spec.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSpecies ? 'Update' : 'Create'} Species
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
            placeholder="Search species..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Species Tree */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading species...</p>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Species Collection</CardTitle>
            <CardDescription>
              Hierarchical view of your fish species. Click arrows to expand/collapse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSpecies.length > 0 ? (
              <div className="space-y-1">
                {renderSpeciesTree(filteredSpecies)}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No species found</p>
                {searchTerm && (
                  <p className="text-sm mt-1">Try adjusting your search terms</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
