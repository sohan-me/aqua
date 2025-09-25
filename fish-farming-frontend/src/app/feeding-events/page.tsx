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
  species?: number;
  species_name?: string;
  event_date: string;
  feeding_time?: string;
  packet_qty?: number;
  packet_size?: number;
  amount_kg?: number;
  total_amount_display?: string;
  feed_list?: FeedItem[];
  memo: string;
  created_at: string;
  total_feed_kg: number;
  total_cost: number;
}


interface Pond {
  pond_id: number;
  name: string;
}

interface Species {
  species_id: number;
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
  unit?: string;
  unit_cost?: number;
}

export default function FeedingEventsPage() {
  const [feedingEvents, setFeedingEvents] = useState<FeedingEvent[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [pondSpecies, setPondSpecies] = useState<Species[]>([]);
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
    species: '',
    event_date: '',
    feeding_time: '',
    feed_amount: '',
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
      
      console.log('Raw customer stocks data:', {
        pondId,
        response,
        feeds,
        firstFeed: feeds[0]
      });
      
      // Filter for feed items only - more flexible filtering
      const feedItems = feeds.filter((stock: any) => {
        const isInventoryPart = stock.item_type === 'inventory_part';
        const isFeedCategory = stock.category === 'feed';
        const hasStock = stock.current_stock > 0;
        const isFeedByName = stock.item_name && stock.item_name.toLowerCase().includes('feed');
        
        console.log('Filtering stock:', {
          stock: stock.item_name,
          isInventoryPart,
          isFeedCategory,
          hasStock,
          isFeedByName,
          category: stock.category,
          item_type: stock.item_type,
          current_stock: stock.current_stock
        });
        
        return isInventoryPart && (isFeedCategory || isFeedByName) && hasStock;
      });
      
      setPondFeeds(feedItems);
      console.log('Pond feeds (filtered):', feedItems);
    } catch (error) {
      console.error('Error fetching pond feeds:', error);
      setPondFeeds([]);
    }
  };

  const fetchPondSpecies = async (pondId: number) => {
    try {
      // Fetch stocking events for this pond
      const response = await get(`/stocking-events/?pond=${pondId}`);
      const stockingEvents = response.results || response;
      
      console.log('Stocking Events Debug:', {
        pondId,
        response,
        stockingEvents,
        firstEvent: stockingEvents[0]
      });
      
      // Extract unique species from stocking events
      const speciesSet = new Set();
      const pondSpeciesList: Species[] = [];
      
      stockingEvents.forEach((event: any) => {
        console.log('Processing event:', event);
        if (event.lines && event.lines.length > 0) {
          event.lines.forEach((line: any) => {
            console.log('Processing line:', line);
            if (line.species_id && !speciesSet.has(line.species_id)) {
              speciesSet.add(line.species_id);
              pondSpeciesList.push({
                species_id: line.species_id,
                name: line.species_name
              });
            }
          });
        }
      });
      
      setPondSpecies(pondSpeciesList);
      console.log('Pond species:', pondSpeciesList);
    } catch (error) {
      console.error('Error fetching pond species:', error);
      setPondSpecies([]);
    }
  };



  const handlePondChange = (pondId: string) => {
    setFormData({ ...formData, pond_id: pondId, species: '' }); // Reset species when pond changes
    if (pondId) {
      fetchPondFeeds(parseInt(pondId));
      fetchPondSpecies(parseInt(pondId));
    } else {
      setPondFeeds([]);
      setPondSpecies([]);
      setSelectedFeed(null);
    }
  };

  const handleFeedSelection = (feed: any) => {
    setSelectedFeed(feed);
    setFormData({ ...formData, feed_item: feed.item.toString() });
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const feedingData = {
        ...formData,
        pond: parseInt(formData.pond_id),
        feed_item: formData.feed_item ? parseInt(formData.feed_item) : null,
        species: formData.species ? parseInt(formData.species) : null,
        amount_kg: formData.feed_amount ? parseFloat(formData.feed_amount) : null,
        feeding_time: formData.feeding_time || null,
        memo: formData.memo || `${formData.feed_amount ? formData.feed_amount + ' units' : '0 units'} feed consumed`,
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
      species: feeding.species?.toString() || '',
      event_date: feeding.event_date,
      feeding_time: feeding.feeding_time || '',
      feed_amount: feeding.amount_kg?.toString() || '',
      memo: feeding.memo,
    });
    
    // Fetch pond feeds and species when editing
    if (feeding.pond_id) {
      fetchPondFeeds(feeding.pond_id);
      fetchPondSpecies(feeding.pond_id);
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
      species: '',
      event_date: '',
      feeding_time: '',
      feed_amount: '',
      memo: '',
    });
    setPondFeeds([]);
    setPondSpecies([]);
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
              <div className="grid grid-cols-3 gap-6 py-4">
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
                  <Label htmlFor="species">Species</Label>
                  <Select
                    value={formData.species || undefined}
                    onValueChange={(value) => setFormData({ ...formData, species: value === "none" ? "" : value })}
                    disabled={!formData.pond_id}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder={formData.pond_id ? "Select species (optional)" : "Select pond first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No species selected</SelectItem>
                      {pondSpecies.filter(spec => spec && spec.species_id).map((spec) => (
                        <SelectItem key={spec.species_id} value={spec.species_id.toString()}>
                          {spec.name}
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
              {formData.pond_id && (
                <div className="space-y-2 py-4">
                  <Label htmlFor="feed_selection">Select Feed from Pond Stock *</Label>
                  {pondFeeds.length > 0 ? (
                    <Select 
                      value={formData.feed_item}
                      onValueChange={(value) => {
                        const feed = pondFeeds.find(f => f.item.toString() === value);
                        if (feed) handleFeedSelection(feed);
                      }}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select feed from pond stock" />
                      </SelectTrigger>
                      <SelectContent>
                        {pondFeeds.map((feed) => (
                          <SelectItem key={feed.item} value={feed.item.toString()}>
                            {feed.item_name} - {feed.current_stock} {feed.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-sm">
                        No feed items available in this pond's stock. Please add feed items to the pond first.
                      </p>
                    </div>
                  )}
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
                  <Label htmlFor="feed_amount">Feed Amount *</Label>
                  <Input
                    id="feed_amount"
                    type="number"
                    step="0.1"
                    value={formData.feed_amount}
                    onChange={(e) => setFormData({ ...formData, feed_amount: e.target.value })}
                    placeholder="Enter feed amount"
                    className="h-12"
                    required
                  />
                  {selectedFeed && (
                    <p className="text-sm text-gray-500">
                      Available: {selectedFeed.current_stock} {selectedFeed.unit}
                    </p>
                  )}
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
                <TableHead>Species</TableHead>
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
                  <TableCell>{event.species_name || '-'}</TableCell>
                  <TableCell>{event.feed_item_name || '-'}</TableCell>
                  <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                  <TableCell>{event.feeding_time || '-'}</TableCell>
                  <TableCell>
                    {event.amount_kg ? `${event.amount_kg} units` : '0.00 units'}
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

