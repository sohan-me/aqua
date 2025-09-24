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
import { Search, Edit, Trash2, Plus, Package } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface FeedingEvent {
  feeding_id: number;
  pond_id: number;
  pond_name?: string;
  feed_item?: number;
  feed_item_name?: string;
  event_date: string;
  feeding_time?: string;
  packet_qty?: number;
  packet_size?: number;
  amount_kg?: number;
  total_amount_display?: string;
  memo: string;
  created_at: string;
  total_feed_kg: number;
  total_cost: number;
}


interface Pond {
  pond_id: number;
  name: string;
}

interface FeedItem {
  item_id: number;
  name: string;
  uom: string;
  protein_content?: number;
  feed_stage?: string;
  description: string;
  current_stock: number;
  cost_price?: number;
  selling_price?: number;
}

export default function FeedingEventsPage() {
  const [feedingEvents, setFeedingEvents] = useState<FeedingEvent[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [pondFeeds, setPondFeeds] = useState<any[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<any>(null);
  console.log(feedItems);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeeding, setEditingFeeding] = useState<FeedingEvent | null>(null);
  const [formData, setFormData] = useState({
    pond_id: '',
    feed_item: '',
    event_date: '',
    feeding_time: '',
    packet_qty: '',
    packet_size: '',
    amount_kg: '',
    memo: '',
  });

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
      
      // Filter for feed items from the items endpoint
      const allItems = itemsResponse.results || itemsResponse;
      const feedItems = allItems.filter((item: any) => 
        item.protein_content !== null || 
        item.feed_stage !== null && item.feed_stage !== '' ||
        item.name.toLowerCase().includes('feed') ||
        item.description.toLowerCase().includes('feed')
      );
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


  const fetchPondFeeds = async (pondId: number) => {
    try {
      const response = await get(`/customer-stocks/?pond=${pondId}`);
      const feeds = response.results || response;
      // Filter for feed items only
      const feedItems = feeds.filter((stock: any) => 
        stock.item_type === 'inventory_part' && 
        (stock.item_name.toLowerCase().includes('feed') || 
         stock.category === 'feed' ||
         stock.current_stock > 0)
      );
      setPondFeeds(feedItems);
      console.log('Pond feeds:', feedItems);
    } catch (error) {
      console.error('Error fetching pond feeds:', error);
      setPondFeeds([]);
    }
  };



  const handlePondChange = (pondId: string) => {
    setFormData({ ...formData, pond_id: pondId });
    if (pondId) {
      fetchPondFeeds(parseInt(pondId));
    } else {
      setPondFeeds([]);
      setSelectedFeed(null);
    }
  };

  const handleFeedSelection = (feed: any) => {
    setSelectedFeed(feed);
    // Auto-populate packet size if available
    if (feed.packet_size) {
      setFormData({ ...formData, packet_size: feed.packet_size.toString(), feed_item: feed.item.toString() });
    } else {
      setFormData({ ...formData, feed_item: feed.item.toString() });
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Calculate amount_kg if packet information is provided
      let calculatedAmountKg = null;
      if (formData.packet_qty && formData.packet_size) {
        calculatedAmountKg = parseFloat(formData.packet_qty) * parseFloat(formData.packet_size);
      } else if (formData.amount_kg) {
        calculatedAmountKg = parseFloat(formData.amount_kg);
      }
      
      const feedingData = {
        ...formData,
        pond: parseInt(formData.pond_id),
        feed_item: formData.feed_item ? parseInt(formData.feed_item) : null,
        packet_qty: formData.packet_qty ? parseFloat(formData.packet_qty) : null,
        packet_size: formData.packet_size ? parseFloat(formData.packet_size) : null,
        amount_kg: calculatedAmountKg,
        feeding_time: formData.feeding_time || null,
        memo: formData.memo || `${calculatedAmountKg ? calculatedAmountKg.toFixed(2) + ' kg' : '0 kg'} feed consumed`,
      };

      if (editingFeeding) {
        await put(`/feeding-events/${editingFeeding.feeding_id}/`, feedingData);
        toast.success('Feeding event updated successfully');
      } else {
        await post('/feeding-events/', feedingData);
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
      feed_item: feeding.feed_item?.toString() || '',
      event_date: feeding.event_date,
      feeding_time: feeding.feeding_time || '',
      packet_qty: feeding.packet_qty?.toString() || '',
      packet_size: feeding.packet_size?.toString() || '',
      amount_kg: feeding.amount_kg?.toString() || '',
      memo: feeding.memo,
    });
    
    // Fetch pond feeds when editing
    if (feeding.pond_id) {
      fetchPondFeeds(feeding.pond_id);
    }
    
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
      feed_item: '',
      event_date: '',
      feeding_time: '',
      packet_qty: '',
      packet_size: '',
      amount_kg: '',
      memo: '',
    });
    setPondFeeds([]);
    setSelectedFeed(null);
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
                    onValueChange={handlePondChange}
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
              
              {/* Feed Selection */}
              {formData.pond_id && pondFeeds.length > 0 && (
                <div className="space-y-2 py-4">
                  <Label htmlFor="feed_selection">Select Feed from Pond Stock</Label>
                  <Select onValueChange={(value) => {
                    const feed = pondFeeds.find(f => f.customer_stock_id.toString() === value);
                    if (feed) handleFeedSelection(feed);
                  }}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select feed from pond stock" />
                    </SelectTrigger>
                    <SelectContent>
                      {pondFeeds.map((feed) => (
                        <SelectItem key={feed.customer_stock_id} value={feed.customer_stock_id.toString()}>
                          {feed.item_name} - {feed.current_stock} {feed.unit} {feed.packet_size && `(${feed.packet_size} kg/packet)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Feeding Details */}
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="feeding_time">Feeding Time</Label>
                  <Input
                    id="feeding_time"
                    type="time"
                    value={formData.feeding_time}
                    onChange={(e) => setFormData({ ...formData, feeding_time: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount_kg">Amount (kg)</Label>
                  <Input
                    id="amount_kg"
                    type="number"
                    step="0.1"
                    value={formData.amount_kg}
                    onChange={(e) => setFormData({ ...formData, amount_kg: e.target.value })}
                    placeholder="Enter amount in kg"
                    className="h-12"
                  />
                </div>
              </div>
              
              {/* Packet Information */}
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="packet_qty">Number of Packets</Label>
                  <Input
                    id="packet_qty"
                    type="number"
                    step="0.1"
                    value={formData.packet_qty}
                    onChange={(e) => setFormData({ ...formData, packet_qty: e.target.value })}
                    placeholder="Enter number of packets"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packet_size">Packet Size (kg)</Label>
                  <Input
                    id="packet_size"
                    type="number"
                    step="0.1"
                    value={formData.packet_size}
                    onChange={(e) => setFormData({ ...formData, packet_size: e.target.value })}
                    placeholder="Enter packet size in kg"
                    className="h-12"
                  />
                </div>
              </div>
              
              {/* Calculated Amount Display */}
              {formData.packet_qty && formData.packet_size && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-blue-800 font-medium">
                    Total Amount: {formData.packet_qty} packets × {formData.packet_size} kg = {(parseFloat(formData.packet_qty) * parseFloat(formData.packet_size)).toFixed(2)} kg
                  </p>
                </div>
              )}
              
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
                <TableHead>Feed Item</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Total Cost (৳)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedingEvents.map((event) => (
                <TableRow key={event.feeding_id}>
                  <TableCell className="font-medium">{event.pond_name}</TableCell>
                  <TableCell>{event.feed_item_name || '-'}</TableCell>
                  <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                  <TableCell>{event.feeding_time || '-'}</TableCell>
                  <TableCell>
                    {event.total_amount_display || 
                     (event.packet_qty && event.packet_size ? 
                       `${event.packet_qty} packets (${(event.packet_qty * event.packet_size).toFixed(2)} kg)` :
                       event.amount_kg ? `${event.amount_kg} kg` :
                       event.total_feed_kg ? `${Number(event.total_feed_kg).toFixed(2)} units` : '0.00 units'
                     )}
                  </TableCell>
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
