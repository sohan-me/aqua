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
import { useStockingEvents, usePonds, useItems, useCreateStockingEvent, useUpdateStockingEvent, useDeleteStockingEvent } from '@/hooks/useApi';
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
  item_id: number;
  item_name?: string;
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


interface Item {
  item_id: number;
  name: string;
  is_species: boolean;
}


export default function StockingEventsPage() {
  const [stockingEvents, setStockingEvents] = useState<StockingEvent[]>([]);
  const [stockingLines, setStockingLines] = useState<StockingLine[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [items, setItems] = useState<Item[]>([]);
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
      const [stockingResponse, pondsResponse, itemsResponse] = await Promise.all([
        get('/stocking-events/'),
        get('/ponds/'),
        get('/items/'),
      ]);
      
      setStockingEvents(stockingResponse.results || stockingResponse);
      setPonds(pondsResponse.results || pondsResponse);
      const allItems = itemsResponse.results || itemsResponse;
      const speciesItems = allItems.filter((item: Item) => item.is_species);
      setItems(speciesItems);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
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
      item_id: 0,
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
            item: line.item_id,
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
          <h1 className="text-3xl font-bold text-gray-900">Stocking Events</h1>
          <p className="text-gray-600 mt-1">Record fish stocking activities and fry placement</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingStocking(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stocking Event
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStocking ? 'Edit Stocking Event' : 'Add New Stocking Event'}</DialogTitle>
              <DialogDescription>
                {editingStocking ? 'Update stocking event information' : 'Record a new fish stocking event'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-6 py-4">
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

              {/* Stocking Lines */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Stocking Lines</Label>
                  <Button type="button" variant="outline" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {lineItems.map((line, index) => (
                    <Card key={index} className="p-6">
                      <div className="grid grid-cols-6 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Species</Label>
                          <Select
                            value={line.item_id?.toString() || ''}
                            onValueChange={(value) => updateLineItem(index, 'item_id', parseInt(value))}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select species" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((item) => (
                                <SelectItem key={item.item_id} value={item.item_id.toString()}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Quantity (pcs)</Label>
                          <Input
                            type="number"
                            value={line.qty_pcs || ''}
                            onChange={(e) => updateLineItem(index, 'qty_pcs', parseInt(e.target.value) || 0)}
                            placeholder="Number of fish"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Pcs per kg</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.pcs_per_kg_at_stocking || ''}
                            onChange={(e) => updateLineItem(index, 'pcs_per_kg_at_stocking', parseFloat(e.target.value) || 0)}
                            placeholder="Fish per kg"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Weight (kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.weight_kg || ''}
                            onChange={(e) => updateLineItem(index, 'weight_kg', parseFloat(e.target.value) || 0)}
                            placeholder="Total weight"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Unit Cost</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.unit_cost || ''}
                            onChange={(e) => updateLineItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                            placeholder="Cost per kg"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Memo</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              value={line.memo || ''}
                              onChange={(e) => updateLineItem(index, 'memo', e.target.value)}
                              placeholder="Notes"
                              className="h-12"
                            />
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
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {calculateTotals().totalFish.toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-600">Total Fish</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {calculateTotals().totalWeight.toFixed(2)} kg
                    </div>
                    <div className="text-sm text-green-600">Total Weight</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ${calculateTotals().totalCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-purple-600">Total Cost</div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStocking ? 'Update' : 'Create'} Stocking Event
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
            placeholder="Search stocking events..."
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
            <p className="text-gray-600">Loading stocking events...</p>
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
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Stocking Event Details
              </DialogTitle>
              <DialogDescription>
                Comprehensive view of stocking event and line items
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Event Header Info */}
              {(() => {
                const event = stockingEvents.find(e => e.stocking_id === showStockingLines);
                if (!event) return null;
                
                return (
                  <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border">
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
                    <div className="space-y-4">
                      {stockingLines.map((line, index) => (
                        <Card key={line.stocking_line_id} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-600">Species</Label>
                                <p className="text-lg font-semibold text-blue-700">{line.item_name}</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-600">Quantity (pieces)</Label>
                                <p className="text-lg font-semibold">{line.qty_pcs.toLocaleString()}</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-600">Pieces per kg</Label>
                                <p className="text-lg font-semibold">
                                  {line.pcs_per_kg_at_stocking ? Number(line.pcs_per_kg_at_stocking).toFixed(2) : 'N/A'}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-600">Weight (kg)</Label>
                                <p className="text-lg font-semibold text-green-600">
                                  {line.weight_kg ? Number(line.weight_kg).toFixed(2) : 'N/A'}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-600">Unit Cost</Label>
                                <p className="text-lg font-semibold text-purple-600">
                                  {line.unit_cost ? `$${Number(line.unit_cost).toFixed(2)}` : 'N/A'}
                                </p>
                              </div>
                              {line.memo && (
                                <div className="space-y-2 md:col-span-2 lg:col-span-4">
                                  <Label className="text-sm font-medium text-gray-600">Memo</Label>
                                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{line.memo}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stocking events found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No stocking events match your search criteria.' : 'Get started by recording your first stocking event.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Stocking Event
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
