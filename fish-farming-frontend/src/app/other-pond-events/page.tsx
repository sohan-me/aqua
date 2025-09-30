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
import { Plus, Search, Edit, Trash2, Package, Calendar, Activity } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

interface OtherPondEvent {
  other_event_id: number;
  pond_id: number;
  pond_name?: string;
  event_date: string;
  category: string;
  memo: string;
  created_at: string;
}

interface Pond {
  pond_id: number;
  name: string;
}

const EVENT_TYPES = [
  'Water Change',
  'Pond Cleaning',
  'Equipment Maintenance',
  'Water Quality Check',
  'Pond Inspection',
  'Harvest Preparation',
  'Pond Repair',
  'Other'
];

export default function OtherPondEventsPage() {
  const [pondEvents, setPondEvents] = useState<OtherPondEvent[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<OtherPondEvent | null>(null);
  const [formData, setFormData] = useState({
    pond_id: '',
    event_date: '',
    category: '',
    memo: '',
  });

  const { get, post, put, delete: del } = useApi();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsResponse, pondsResponse] = await Promise.all([
        get('/other-pond-events/'),
        get('/ponds/'),
      ]);
      
      setPondEvents(eventsResponse.results || eventsResponse);
      setPonds(pondsResponse.results || pondsResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const eventData = {
        ...formData,
        pond: parseInt(formData.pond_id),
      };
      
      console.log('Other pond event data being sent:', eventData);

      if (editingEvent) {
        await put(`/other-pond-events/${editingEvent.other_event_id}/`, eventData);
        toast.success('Pond event updated successfully');
      } else {
        await post('/other-pond-events/', eventData);
        toast.success('Pond event created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving pond event:', error);
      toast.error('Failed to save pond event');
    }
  };

  const handleEdit = (event: OtherPondEvent) => {
    setEditingEvent(event);
    setFormData({
      pond_id: event.pond_id.toString(),
      event_date: event.event_date,
      category: event.category,
      memo: event.memo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (eventId: number) => {
    if (confirm('Are you sure you want to delete this pond event?')) {
      try {
        await del(`/other-pond-events/${eventId}/`);
        toast.success('Pond event deleted successfully');
        fetchData();
      } catch (error) {
        console.error('Error deleting pond event:', error);
        toast.error('Failed to delete pond event');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      pond_id: '',
      event_date: '',
      category: '',
      memo: '',
    });
  };

  const filteredPondEvents = pondEvents.filter(event =>
    event.pond_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.memo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Other Pond Events</h1>
          <p className="text-gray-600 mt-1">Record miscellaneous pond activities and maintenance events</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingEvent(null); resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pond Event
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Pond Event' : 'Add New Pond Event'}</DialogTitle>
              <DialogDescription>
                {editingEvent ? 'Update pond event information' : 'Record a new pond activity or maintenance event'}
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
                  <Label htmlFor="category">Event Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">Memo</Label>
                <Textarea
                  id="memo"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="Additional notes about the pond event"
                  rows={4}
                  className="min-h-[100px]"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEvent ? 'Update' : 'Create'} Pond Event
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
            placeholder="Search pond events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Pond Events Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pond events...</p>
          </div>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pond</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPondEvents.map((event) => (
                <TableRow key={event.other_event_id}>
                  <TableCell className="font-medium">{event.pond_name}</TableCell>
                  <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.category}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{event.memo}</TableCell>
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
                        onClick={() => handleDelete(event.other_event_id)}
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

      {filteredPondEvents.length === 0 && !loading && (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pond events found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'No pond events match your search criteria.' : 'Get started by recording your first pond event.'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pond Event
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
