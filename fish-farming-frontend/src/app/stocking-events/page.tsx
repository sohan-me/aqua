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
import { Plus, Search, Edit, Trash2, Package, Calendar, Fish, Scale, X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useStockingEvents, usePonds, useSpecies, useCreateStockingEvent, useUpdateStockingEvent, useDeleteStockingEvent } from '@/hooks/useApi';
import { toast } from 'sonner';

interface StockingEvent {
  stocking_id: number;
  pond_id: number;
  pond_name?: string;
  event_date: string;
  line_summary: string;
  memo: string;
  created_at: string;
  total_fish: number;
  total_weight: number;
  total_cost: number;
}

interface StockingLine {
  stocking_line_id: number;
  stocking_id: number;
  species_id: number;
  species_name?: string;
  qty_pcs: number;
  pcs_per_kg_at_stocking: number;
  weight_kg: number | null;
  unit_cost: number | null;
  memo: string;
}

interface Pond {
  pond_id: number;
  name: string;
}


interface Species {
  id: number;
  name: string;
  scientific_name?: string;
}


export default function StockingEventsPage() {
  const [stockingEvents, setStockingEvents] = useState<StockingEvent[]>([]);
  const [stockingLines, setStockingLines] = useState<StockingLine[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStocking, setEditingStocking] = useState<StockingEvent | null>(null);
  const [showStockingLines, setShowStockingLines] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    pond_id: '',
    event_date: '',
    line_summary: '',
    memo: '',
  });
  const [lineItems, setLineItems] = useState<Partial<StockingLine>[]>([]);

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockingResponse, pondsResponse, speciesResponse] = await Promise.all([
        get('/stocking-events/'),
        get('/ponds/'),
        get('/species/?tree=true'),
      ]);
      
      setStockingEvents(stockingResponse.results || stockingResponse);
      setPonds(pondsResponse.results || pondsResponse);
      
      // Flatten the species tree for the dropdown
      const allSpecies = flattenSpeciesTree(speciesResponse);
      setSpecies(allSpecies);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const flattenSpeciesTree = (speciesTree: any[]): Species[] => {
    const flattened: Species[] = [];
    
    const flatten = (items: any[]) => {
      items.forEach(item => {
        flattened.push({
          id: item.id,
          name: item.full_path || item.name,
          scientific_name: item.scientific_name || '',
        });
        if (item.children && item.children.length > 0) {
          flatten(item.children);
        }
      });
    };
    
    flatten(speciesTree);
    return flattened;
  };

  const fetchStockingLines = async (stockingId: number) => {
    try {
      const response = await get(`/stocking-events/${stockingId}/lines/`);
      setStockingLines(response.results || response);
    } catch (error) {
      console.error('Error fetching stocking lines:', error);
    }
  };

  const calculateTotals = () => {
    const totalFish = lineItems.reduce((sum, line) => sum + (line.qty_pcs || 0), 0);
    const totalWeight = lineItems.reduce((sum, line) => sum + (line.weight_kg || 0), 0);
    const totalCost = lineItems.reduce((sum, line) => {
      const weight = line.weight_kg || 0;
      const cost = line.unit_cost || 0;
      return sum + (weight * cost);
    }, 0);
    return { totalFish, totalWeight, totalCost };
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      species_id: 0,
      qty_pcs: 0,
      pcs_per_kg_at_stocking: 0,
      weight_kg: null,
      unit_cost: null,
      memo: '',
    }]);
  };

  const updateLineItem = (index: number, field: keyof StockingLine, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate weight when pcs per kg changes
    if (field === 'pcs_per_kg_at_stocking') {
      const qty = updated[index].qty_pcs || 0;
      const pcsPerKg = value || 0;
      if (pcsPerKg > 0 && qty > 0) {
        updated[index].weight_kg = qty / pcsPerKg;
      }
    }
    
    // Auto-calculate pcs per kg when weight changes
    if (field === 'weight_kg') {
      const qty = updated[index].qty_pcs || 0;
      const weight = value || 0;
      if (weight > 0 && qty > 0) {
        updated[index].pcs_per_kg_at_stocking = qty / weight;
      }
    }
    
    // Auto-calculate weight when quantity changes (if pcs per kg is set)
    if (field === 'qty_pcs') {
      const qty = value || 0;
      const pcsPerKg = updated[index].pcs_per_kg_at_stocking || 0;
      if (pcsPerKg > 0 && qty > 0) {
        updated[index].weight_kg = qty / pcsPerKg;
      }
    }
    
    // Note: Total cost is calculated dynamically in calculateTotals()
    
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totals = calculateTotals();
      const stockingData = {
        ...formData,
        pond: parseInt(formData.pond_id),
        line_summary: `${totals.totalFish} fish, ${totals.totalWeight.toFixed(2)} kg`,
      };

      if (editingStocking) {
        await put(`/stocking-events/${editingStocking.stocking_id}/`, stockingData);
        toast.success('Stocking event updated successfully');
      } else {
        const response = await post('/stocking-events/', stockingData);
        
        // Create stocking lines
        for (const line of lineItems) {
          await post(`/stocking-events/${response.stocking_id}/add_line/`, {
            species: line.species_id,
            qty_pcs: line.qty_pcs || 0,
            pcs_per_kg_at_stocking: line.pcs_per_kg_at_stocking || 0,
            weight_kg: line.weight_kg || 0,
            unit_cost: line.unit_cost || 0,
            memo: line.memo || '',
          });
        }
        
        toast.success('Stocking event created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingStocking(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving stocking event:', error);
      toast.error('Failed to save stocking event');
    }
  };

  const handleEdit = (stocking: StockingEvent) => {
    setEditingStocking(stocking);
    setFormData({
      pond_id: stocking.pond_id.toString(),
      event_date: stocking.event_date,
      line_summary: stocking.line_summary,
      memo: stocking.memo,
    });
    setLineItems([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (stockingId: number) => {
    if (confirm('Are you sure you want to delete this stocking event?')) {
      try {
        await del(`/stocking-events/${stockingId}/`);
        toast.success('Stocking event deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting stocking event:', error);
        toast.error('Failed to delete stocking event');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      pond_id: '',
      event_date: '',
      line_summary: '',
      memo: '',
    });
    setLineItems([]);
  };

  const filteredStockingEvents = stockingEvents.filter(event =>
    event.pond_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.line_summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.memo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fish Stocking</h1>
          <p className="text-gray-600 mt-1">Record fish stocking activities and fry placement</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingStocking(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fish Stocking
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-green-50">
            <DialogHeader className="pb-6 border-b border-gray-200">
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Fish className="h-6 w-6 text-blue-600" />
                </div>
                {editingStocking ? 'Edit Fish Stocking' : 'Add New Fish Stocking'}
              </DialogTitle>
              <DialogDescription className="text-base text-gray-600 mt-2">
                {editingStocking ? 'Update fish stocking event information' : 'Record a new fish stocking event with species and quantities'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  Event Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pond_id">Pond *</Label>
                  <Select
                    value={formData.pond_id}
                    onValueChange={(value) => setFormData({ ...formData, pond_id: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select pond" />
                    </SelectTrigger>
                    <SelectContent>
                      {ponds.map((pond) => (
                        <SelectItem key={pond.pond_id} value={pond.pond_id.toString()}>
                          {pond.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_date">Event Date *</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="h-12"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line_summary">Line Summary</Label>
                  <Input
                    id="line_summary"
                    value={formData.line_summary}
                    onChange={(e) => setFormData({ ...formData, line_summary: e.target.value })}
                    placeholder="Brief summary of stocking"
                    className="h-12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">Memo</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Additional notes about the stocking event"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  Species & Quantities
                </h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium text-gray-700">Stocking Lines</Label>
                    <Button type="button" variant="outline" onClick={addLineItem} className="bg-white border-green-200 text-green-700 hover:bg-green-50">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Species
                    </Button>
                  </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Species</TableHead>
                        <TableHead className="font-semibold">Quantity (pcs)</TableHead>
                        <TableHead className="font-semibold">Pcs per kg</TableHead>
                        <TableHead className="font-semibold">Weight (kg)</TableHead>
                        <TableHead className="font-semibold">Unit Cost</TableHead>
                        <TableHead className="font-semibold">Memo</TableHead>
                        <TableHead className="font-semibold w-16">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((line, index) => (
                        <TableRow key={index} className="hover:bg-blue-50">
                          <TableCell>
                            <Select
                              value={line.species_id?.toString() || ''}
                              onValueChange={(value) => updateLineItem(index, 'species_id', parseInt(value))}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select species" />
                              </SelectTrigger>
                              <SelectContent>
                                {species.map((spec) => (
                                  <SelectItem key={spec.id} value={spec.id.toString()}>
                                    {spec.scientific_name ? `${spec.name} (${spec.scientific_name})` : spec.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={line.qty_pcs || ''}
                              onChange={(e) => updateLineItem(index, 'qty_pcs', parseInt(e.target.value) || 0)}
                              placeholder="Number of fish"
                              className="h-10"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.pcs_per_kg_at_stocking || ''}
                              onChange={(e) => updateLineItem(index, 'pcs_per_kg_at_stocking', parseFloat(e.target.value) || 0)}
                              placeholder="Fish per kg"
                              className="h-10"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.weight_kg || ''}
                              onChange={(e) => updateLineItem(index, 'weight_kg', parseFloat(e.target.value) || 0)}
                              placeholder="Total weight"
                              className="h-10"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.unit_cost || ''}
                              onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                              placeholder="Cost per kg"
                              className="h-10"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={line.memo || ''}
                              onChange={(e) => updateLineItem(index, 'memo', e.target.value)}
                              placeholder="Notes"
                              className="h-10"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                              className="h-10 w-10 p-0 text-red-600 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Scale className="h-5 w-5 text-purple-600" />
                    Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200 text-center">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {calculateTotals().totalFish.toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-blue-600">Total Fish</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200 text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {calculateTotals().totalWeight.toFixed(2)} kg
                      </div>
                      <div className="text-sm font-medium text-green-600">Total Weight</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-200 text-center">
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        ${calculateTotals().totalCost.toFixed(2)}
                      </div>
                      <div className="text-sm font-medium text-purple-600">Total Cost</div>
                    </div>
                  </div>
                </div>
                </div>
              </div>

              <DialogFooter className="pt-6 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                <div className="flex gap-3 w-full">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
                    {editingStocking ? 'Update' : 'Create'} Fish Stocking
                  </Button>
                </div>
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
            placeholder="Search fish stocking events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stocking Events Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading fish stocking events...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pond</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Total Fish</TableHead>
                <TableHead>Total Weight</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStockingEvents.map((event) => (
                <TableRow key={event.stocking_id}>
                  <TableCell className="font-medium">{event.pond_name}</TableCell>
                  <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                  <TableCell>{event.line_summary}</TableCell>
                  <TableCell>{event.total_fish.toLocaleString()}</TableCell>
                  <TableCell>{Number(event.total_weight).toFixed(2)} kg</TableCell>
                  <TableCell>${Number(event.total_cost).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(event)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={showStockingLines === event.stocking_id ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (showStockingLines === event.stocking_id) {
                            setShowStockingLines(null);
                          } else {
                            setShowStockingLines(event.stocking_id);
                            fetchStockingLines(event.stocking_id);
                          }
                        }}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(event.stocking_id)}
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

      {/* Stocking Event Details Modal */}
      {showStockingLines && (
        <Dialog open={true} onOpenChange={() => setShowStockingLines(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 to-green-50">
            <DialogHeader className="pb-6 border-b border-gray-200">
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Fish className="h-6 w-6 text-blue-600" />
                </div>
                Fish Stocking Details
              </DialogTitle>
              <DialogDescription className="text-base text-gray-600 mt-2">
                Comprehensive view of fish stocking event and species details
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Event Header Info */}
              {(() => {
                const event = stockingEvents.find(e => e.stocking_id === showStockingLines);
                if (!event) return null;
                
                return (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{event.pond_name}</h3>
                        <p className="text-gray-600">{new Date(event.event_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">{event.total_fish.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">Total Fish</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{Number(event.total_weight).toFixed(2)} kg</div>
                        <div className="text-sm text-gray-600">Total Weight</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">${Number(event.total_cost).toFixed(2)}</div>
                        <div className="text-sm text-gray-600">Total Cost</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg">
                        <div className="text-sm text-gray-700">{event.line_summary}</div>
                        <div className="text-sm text-gray-600">Summary</div>
                      </div>
                    </div>
                    
                    {(event.memo || event.created_at) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {event.memo && (
                            <div>
                              <span className="font-medium text-gray-600">Memo:</span>
                              <p className="text-gray-700 mt-1">{event.memo}</p>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-gray-600">Created:</span>
                            <p className="text-gray-700 mt-1">{new Date(event.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Stocking Lines Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stocking Line Items</CardTitle>
                  <CardDescription>
                    Detailed breakdown of all species and quantities stocked
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stockingLines.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">Species</TableHead>
                            <TableHead className="font-semibold">Quantity (pcs)</TableHead>
                            <TableHead className="font-semibold">Pcs per kg</TableHead>
                            <TableHead className="font-semibold">Weight (kg)</TableHead>
                            <TableHead className="font-semibold">Unit Cost ($)</TableHead>
                            <TableHead className="font-semibold">Memo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockingLines.map((line, index) => (
                            <TableRow key={line.stocking_line_id} className="hover:bg-blue-50">
                              <TableCell className="font-medium text-blue-700">
                                {line.species_name}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {line.qty_pcs.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {line.pcs_per_kg_at_stocking ? Number(line.pcs_per_kg_at_stocking).toFixed(2) : 'N/A'}
                              </TableCell>
                              <TableCell className="text-green-600">
                                {line.weight_kg ? Number(line.weight_kg).toFixed(2) : 'N/A'}
                              </TableCell>
                              <TableCell className="text-purple-600">
                                {line.unit_cost ? `$${Number(line.unit_cost).toFixed(2)}` : 'N/A'}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                {line.memo ? (
                                  <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                    {line.memo}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No stocking lines found</h3>
                      <p className="text-gray-600">This stocking event doesn't have any line items recorded.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {filteredStockingEvents.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No fish stocking events found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No fish stocking events match your search criteria.' : 'Get started by recording your first fish stocking event.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fish Stocking
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
