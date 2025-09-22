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
import { Plus, Search, Edit, Trash2, Package, Calendar, Fish, Scale } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface FeedingEvent {
  feeding_id: number;
  pond_id: number;
  pond_name?: string;
  event_date: string;
  memo: string;
  created_at: string;
  total_feed_kg: number;
  total_cost: number;
}

interface FeedingLine {
  feeding_line_id: number;
  feeding_id: number;
  item_id: number;
  feed_name?: string;
  qty: number;
  unit_cost: number;
}

interface Pond {
  pond_id: number;
  name: string;
}

interface FeedItem {
  item_id: number;
  name: string;
  is_feed: boolean;
  item_type: string;
  description: string;
}

export default function FeedingEventsPage() {
  const [feedingEvents, setFeedingEvents] = useState<FeedingEvent[]>([]);
  const [feedingLines, setFeedingLines] = useState<FeedingLine[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeeding, setEditingFeeding] = useState<FeedingEvent | null>(null);
  const [showFeedingLines, setShowFeedingLines] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    pond_id: '',
    event_date: '',
    memo: '',
  });
  const [lineItems, setLineItems] = useState<Partial<FeedingLine>[]>([]);

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [feedingResponse, pondsResponse, itemsResponse] = await Promise.all([
        get('/feeding-events/'),
        get('/ponds/'),
        get('/items/'),
      ]);
      
      setFeedingEvents(feedingResponse.results || feedingResponse);
      setPonds(pondsResponse.results || pondsResponse);
      
      // Debug logging for feeding events
      console.log('Feeding Events Debug:', {
        feedingResponse,
        events: feedingResponse.results || feedingResponse,
        firstEvent: (feedingResponse.results || feedingResponse)[0]
      });
      
      // Filter for feed items only
      const allItems = itemsResponse.results || itemsResponse;
      const feedItems = allItems.filter((item: any) => item.is_feed === true);
      console.log('Feed Items Debug:', {
        allItems: allItems.length,
        feedItems: feedItems.length,
        feedItemsData: feedItems
      });
      setFeedItems(feedItems);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedingLines = async (feedingId: number) => {
    try {
      const response = await get(`/feeding-events/${feedingId}/lines/`);
      setFeedingLines(response.results || response);
    } catch (error) {
      console.error('Error fetching feeding lines:', error);
    }
  };

  const calculateTotals = () => {
    const totalFeedKg = lineItems.reduce((sum, line) => sum + (line.qty || 0), 0);
    const totalCost = lineItems.reduce((sum, line) => sum + ((line.qty || 0) * (line.unit_cost || 0)), 0);
    return { totalFeedKg, totalCost };
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      item_id: 0,
      qty: 0,
      unit_cost: 0,
    }]);
  };

  const updateLineItem = (index: number, field: keyof FeedingLine, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculation logic
    if (field === 'qty' || field === 'unit_cost') {
      // If quantity or unit cost changes, calculate total cost
      const quantity = updated[index].qty || 0;
      const unitCost = updated[index].unit_cost || 0;
      updated[index].total_cost = quantity * unitCost;
    } else if (field === 'total_cost') {
      // If total cost changes, calculate unit cost
      const quantity = updated[index].qty || 0;
      const totalCost = updated[index].total_cost || 0;
      if (quantity > 0) {
        updated[index].unit_cost = totalCost / quantity;
      } else {
        updated[index].unit_cost = 0;
      }
    }
    
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totals = calculateTotals();
      const feedingData = {
        ...formData,
        pond: parseInt(formData.pond_id),
        memo: `${totals.totalFeedKg.toFixed(2)} kg feed, ৳${totals.totalCost.toFixed(2)} total cost`,
      };

      if (editingFeeding) {
        await put(`/feeding-events/${editingFeeding.feeding_id}/`, feedingData);
        toast.success('Feeding event updated successfully');
      } else {
        const response = await post('/feeding-events/', feedingData);
        
        // Create feeding lines
        for (const line of lineItems) {
          if (line.item_id && line.qty > 0) {
            await post('/feeding-lines/', {
              feeding_event: response.feeding_id,
              item: line.item_id,
              qty: line.qty,
              unit_cost: line.unit_cost || 0,
            });
          }
        }
        
        toast.success('Feeding event created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingFeeding(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving feeding event:', error);
      toast.error('Failed to save feeding event');
    }
  };

  const handleEdit = (feeding: FeedingEvent) => {
    setEditingFeeding(feeding);
    setFormData({
      pond_id: feeding.pond_id.toString(),
      event_date: feeding.event_date,
      memo: feeding.memo,
    });
    setLineItems([]);
    setIsDialogOpen(true);
  };

  const handleDelete = async (feedingId: number) => {
    if (!feedingId) {
      console.error('Delete failed: feedingId is undefined', { feedingId });
      toast.error('Cannot delete: Invalid feeding event ID');
      return;
    }
    
    if (confirm('Are you sure you want to delete this feeding event?')) {
      try {
        console.log('Deleting feeding event:', feedingId);
        await del(`/feeding-events/${feedingId}/`);
        toast.success('Feeding event deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting feeding event:', error);
        toast.error('Failed to delete feeding event');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      pond_id: '',
      event_date: '',
      memo: '',
    });
    setLineItems([]);
  };

  const filteredFeedingEvents = feedingEvents.filter(event =>
    event.pond_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.memo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feeding Events</h1>
          <p className="text-gray-600 mt-1">Record fish feeding activities and feed consumption</p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingFeeding(null); resetForm(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Feeding Event
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFeeding ? 'Edit Feeding Event' : 'Add New Feeding Event'}</DialogTitle>
              <DialogDescription>
                {editingFeeding ? 'Update feeding event information' : 'Record a new fish feeding event'}
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">Memo</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Additional notes about the feeding event"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              {/* Feeding Lines */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Feeding Lines</Label>
                  <Button type="button" variant="outline" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Line
                  </Button>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {lineItems.map((line, index) => (
                    <Card key={index} className="p-6">
                      <div className="grid grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Feed Type</Label>
                          <Select
                            value={line.item_id?.toString() || ''}
                            onValueChange={(value) => updateLineItem(index, 'item_id', parseInt(value))}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select feed" />
                            </SelectTrigger>
                            <SelectContent>
                              {feedItems.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                  <p className="text-sm">No feed types available</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Go to Master Data → Feed Types to add feed types
                                  </p>
                                </div>
                              ) : (
                                feedItems.map((feed) => (
                                  <SelectItem key={feed.item_id} value={feed.item_id.toString()}>
                                    {feed.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Quantity (kg)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.qty || ''}
                            onChange={(e) => updateLineItem(index, 'qty', parseFloat(e.target.value) || 0)}
                            placeholder="Feed quantity"
                            className="h-12"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Unit Cost (৳)</Label>
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
                          <Label>Total Cost (৳)</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={line.total_cost || 0}
                              onChange={(e) => updateLineItem(index, 'total_cost', parseFloat(e.target.value) || 0)}
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

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {calculateTotals().totalFeedKg.toFixed(2)} kg
                    </div>
                    <div className="text-sm text-green-600">Total Feed</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ৳${calculateTotals().totalCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-purple-600">Total Cost (৳)</div>
                  </div>
                </div>
                
                {/* Auto-calculation note */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>💡 Auto-calculation:</strong> Enter quantity + unit cost to calculate total cost, 
                    or enter quantity + total cost to calculate unit cost automatically.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingFeeding ? 'Update' : 'Create'} Feeding Event
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search feeding events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Feeding Events Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading feeding events...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pond</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Feed</TableHead>
                <TableHead>Total Cost (৳)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedingEvents.map((event) => (
                <TableRow key={event.feeding_id}>
                  <TableCell className="font-medium">{event.pond_name}</TableCell>
                  <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                  <TableCell>{event.total_feed_kg ? Number(event.total_feed_kg).toFixed(2) : '0.00'} kg</TableCell>
                  <TableCell>৳{event.total_cost ? Number(event.total_cost).toFixed(2) : '0.00'}</TableCell>
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
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (showFeedingLines === event.feeding_id) {
                            setShowFeedingLines(null);
                          } else {
                            setShowFeedingLines(event.feeding_id);
                            fetchFeedingLines(event.feeding_id);
                          }
                        }}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('Delete button clicked for event:', event);
                          handleDelete(event.feeding_id);
                        }}
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

      {filteredFeedingEvents.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No feeding events found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No feeding events match your search criteria.' : 'Get started by recording your first feeding event.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Feeding Event
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
